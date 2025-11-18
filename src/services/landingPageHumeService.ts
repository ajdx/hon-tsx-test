import { Hume, HumeClient, convertBlobToBase64 } from 'hume';

// Define types for the landing page EVI service
export type LandingHonSessionStatus = 'idle' | 'connecting' | 'active' | 'error';
export type LandingHonProcessingState = 'idle' | 'listening' | 'thinking' | 'speaking';

// Create a separate service class for Landing Page Hume EVI integration
export class LandingPageHumeService {
  private evi: Hume.empathicVoice.chat.ChatSocket | null = null;
  private isActive: boolean = false;
  private statusChangeCallbacks: ((status: LandingHonSessionStatus) => void)[] = [];
  private visualIndicatorCallbacks: ((isActive: boolean, processingState: LandingHonProcessingState) => void)[] = [];
  private currentStatus: LandingHonSessionStatus = 'idle';
  private processingState: LandingHonProcessingState = 'idle';
  
  // Continuous audio system for zero-click playback
  private audioQueue: ArrayBuffer[] = [];
  private isPlayingAudio: boolean = false;
  private audioContext: AudioContext | null = null;
  private mainGainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  // Microphone input state
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isCapturingAudio: boolean = false;
  private isMuted: boolean = false;

  constructor() {
    // Service initialization (debug logs removed for production)
    this.wsUrl = null;
  }

  // Subscribe to status changes
  public onStatusChange(callback: (status: LandingHonSessionStatus) => void): () => void {
    this.statusChangeCallbacks.push(callback);
    return () => {
      const index = this.statusChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.statusChangeCallbacks.splice(index, 1);
      }
    };
  }

  // Subscribe to visual indicator changes
  public onVisualIndicatorChange(callback: (isActive: boolean, processingState: LandingHonProcessingState) => void): () => void {
    this.visualIndicatorCallbacks.push(callback);
    return () => {
      const index = this.visualIndicatorCallbacks.indexOf(callback);
      if (index > -1) {
        this.visualIndicatorCallbacks.splice(index, 1);
      }
    };
  }

  // Update session status
  private updateStatus(status: LandingHonSessionStatus) {
    if (this.currentStatus !== status) {
      this.currentStatus = status;
      console.log(`Landing Page Hon status changed to: ${status}`);
      this.statusChangeCallbacks.forEach(callback => callback(status));
    }
  }

  // Update visual indicator
  private updateVisualIndicator(isActive: boolean, processingState?: LandingHonProcessingState) {
    this.isActive = isActive;
    if (processingState !== undefined) {
      this.processingState = processingState;
    }
    console.log(`Landing Page Hon visual indicator: ${isActive}, state: ${this.processingState}`);
    this.visualIndicatorCallbacks.forEach(callback => callback(isActive, this.processingState));
  }

  // Start a session with the landing page Hon assistant
  public async startSession(): Promise<boolean> {
    if (this.currentStatus === 'connecting' || this.currentStatus === 'active') {
      console.warn('Landing page session already connecting or active.');
      return this.currentStatus === 'active';
    }

    try {
      this.updateStatus('connecting');

      // Fetch access token from the landing page specific endpoint
      if (import.meta.env.DEV) console.log('Fetching landing page Hume access token...');
      const tokenResponse = await fetch('/api/hume/generate-landing-token', { method: 'POST' });
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({ error: 'Failed to parse token error response' }));
        throw new Error(`Failed to fetch landing page Hume token: ${tokenResponse.status} - ${errorData?.error || 'Unknown error'}`);
      }
      const { accessToken, configId } = await tokenResponse.json();
      if (!accessToken || !configId) {
        throw new Error('Received null or undefined access token/config from backend.');
      }
      if (import.meta.env.DEV) console.log('Successfully fetched landing page Hume access token and config ID.');

      // Connect to EVI using the token and landing page config
      const tempClient = new HumeClient({ accessToken });
      this.evi = await tempClient.empathicVoice.chat.connect({
        configId: configId,
        // Remove WAV headers to prevent clicking/thumping artifacts (per Hume docs)
        strip_headers: true,
      });
      console.log("Landing page EVI chat.connect call completed using access token and config:", configId);

      // Set up the persistent event handlers immediately after connect returns
      this.setupEventHandlers();
      console.log("Landing page persistent event handlers set up.");
      
      // Remove immediate audio capture start - let the 'open' event handler do it
      // The 'open' event will automatically start audio capture when connection is truly active

      // Add a connection timeout safety check
      setTimeout(() => {
        if (this.currentStatus === 'connecting') {
          console.warn('Landing page: Connection timeout - still in connecting state after 30 seconds');
          this.updateStatus('error');
        }
      }, 30000);

      return true;

    } catch (error) {
      console.error('Failed to start landing page Hon session:', error);
      this.updateStatus('error');
      this.evi = null;
      return false;
    }
  }

  // End the session
  public async endSession(): Promise<boolean> {
    try {
      // Stop audio capture if active
      if (this.isCapturingAudio) {
        this.stopAudioCapture();
      }

      // Stop any playing audio
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource = null;
      }
      
      // Clear the audio queue
      this.audioQueue = [];
      this.isPlayingAudio = false;
      
      // Close the WebSocket connection IF evi exists
      if (this.evi && this.evi.socket) {
        console.log("Landing page: Attempting to close EVI socket...");
        if (typeof (this.evi as any).disconnect === 'function') {
           (this.evi as any).disconnect();
        } else {
           this.evi.socket.close();
        }
      } else {
        console.warn("Landing page: Cannot explicitly close socket: evi or evi.socket is null.");
      }

      this.evi = null;
      this.updateStatus('idle');
      this.updateVisualIndicator(false);
      console.log("Landing page EVI session ended and cleaned up.");
      return true;
    } catch (error) {
      console.error('Failed to end landing page Hon session:', error);
      this.evi = null;
      this.updateStatus('error');
      this.updateVisualIndicator(false);
      return false;
    }
  }

  // Toggle Mute state
  public async toggleMute(): Promise<void> {
    this.isMuted = !this.isMuted;
    console.log(`Landing page: Toggled mute state. isMuted is now: ${this.isMuted}`);
    if (this.isMuted) {
      this.stopAudioCapture();
    } else {
      if (this.currentStatus === 'active') {
        await this.startAudioCapture();
      } else {
        console.log("Landing page toggleMute: Session not active, skipping audio capture start on unmute.");
      }
    }
  }

  // Set up event handlers for the EVI session
  private setupEventHandlers() {
    if (!this.evi) {
      console.error("Landing page setupEventHandlers called but this.evi is null!");
      return;
    }
    console.log("Landing page: Setting up persistent event handlers...");

    this.evi.on('open', () => {
      console.log('Landing page: Persistent open handler fired.');
      this.updateStatus('active');
      this.updateVisualIndicator(true, 'listening');
      // Start audio capture ONLY IF NOT MUTED
      if (!this.isMuted) {
        console.log('Landing page: Connection is now active, starting audio capture...');
        this.startAudioCapture();
      } else {
        console.log("Landing page: Connection active but user is muted, skipping audio capture start.");
      }
    });

    this.evi.on('close', () => {
      console.log('Landing page: Persistent close handler fired.');
      this.updateStatus('idle');
      this.updateVisualIndicator(false, 'idle');
      this.stopAudioCapture();
    });

    this.evi.on('error', (error: Error) => { 
      // Ignore unknown/new message types from Hume as non-fatal (and silence in prod)
      if (error.message && error.message.includes('unknown message type')) {
        if (import.meta.env.DEV) {
          if (import.meta.env.DEV) console.warn('Landing page: Ignoring unknown message type error (non-fatal, likely new Hume event).');
        }
        return;
      }
      if (import.meta.env.DEV) {
        console.error('Landing page: Persistent error handler fired:', error);
        console.error('Landing page: Error details:', error.message, error.stack);
      }
      if (this.currentStatus !== 'error') {
        this.updateStatus('error');
      }
      this.updateVisualIndicator(false, 'idle');
      this.stopAudioCapture();
    });

    this.evi.on('message', (event: any) => {
      if (!this.evi) {
        console.warn("Landing page: Received message after EVI session ended. Ignoring.");
        return;
      }
      this.processIncomingMessage(event);
    });
  }

  // Process incoming messages from Hume
  private processIncomingMessage(event: any) {
    console.log(`Landing page: Received event type: ${event?.type}`, event);

    try {
      switch (event.type) {
        case 'audio_output':
          if (event.data && typeof event.data === 'string') {
            console.log('Landing page: Detected audio_output with base64 data.');
            this.updateVisualIndicator(true, 'speaking');
            this.enqueueAudioSegment(event.data);
          } else {
            console.warn('Landing page: Received audio_output without valid base64 data.', event);
          }
          break;

        case 'assistant_message':
          this.updateVisualIndicator(true, 'thinking');
          console.log(`Landing page: Assistant message: Role=${event.message?.role}, Content type=${event.message?.content?.type}`);
          break;
          
        case 'user_message':
          this.updateVisualIndicator(true, 'listening');
          console.log(`Landing page: User message: Role=${event.message?.role}, Content type=${event.message?.content?.type}`);
          // Handle interruption as per Hume docs - user started speaking
          this.handleAudioInterruption();
          break;

        case 'chat_metadata':
          console.log('Landing page: Received chat_metadata event.');
          break;

        case 'user_interruption':
          console.log('Landing page: Received user_interruption event.');
          // Per Hume docs: stop current audio and clear queue on interruption
          this.handleAudioInterruption();
          break;
        
        case 'assistant_end':
          console.log('Landing page: Received assistant_end event.');
          this.updateVisualIndicator(true, 'idle');
          // Continue processing queue if there are remaining segments
          this.processGaplessAudioQueue(); 
          break;
          
        default:
           console.warn("Landing page: Received message event without known type or data field:", event);
          break; 
      } 

    } catch (error) {
      console.error('Landing page: Error processing incoming message:', error);
    }
  }

  // Enqueue audio segments for gapless playback
  private async enqueueAudioSegment(base64Data: string) {
    try {
      console.log("Landing page: Converting base64 to audio buffer for gapless queue...");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Strip WAV header to get raw audio data
      const rawAudioData = this.stripWavHeader(bytes);
      console.log(`Landing page: Stripped WAV header, raw audio: ${rawAudioData.byteLength} bytes`);
      
      // Add to gapless queue and process
      this.audioQueue.push(rawAudioData.buffer);
      this.processGaplessAudioQueue();
    } catch (error) {
      console.error('Landing page: Error converting base64 to audio buffer:', error);
    }
  }

  // Strip WAV header to get raw PCM data for seamless concatenation
  private stripWavHeader(wavData: Uint8Array): Uint8Array {
    // If the buffer doesn't start with "RIFF", assume it's raw PCM and return unchanged
    if (
      wavData.length < 4 ||
      wavData[0] !== 0x52 ||
      wavData[1] !== 0x49 ||
      wavData[2] !== 0x46 ||
      wavData[3] !== 0x46
    ) {
      return wavData;
    }

    // WAV file structure:
    // Bytes 0-3: "RIFF"
    // Bytes 4-7: File size
    // Bytes 8-11: "WAVE"
    // Bytes 12-15: "fmt "
    // Bytes 16-19: Format chunk size (usually 16)
    // Bytes 20-35: Format data
    // Bytes 36-39: "data"
    // Bytes 40-43: Data chunk size
    // Bytes 44+: Raw audio data

    // Find the "data" chunk
    for (let i = 12; i < wavData.length - 4; i++) {
      if (
        wavData[i] === 0x64 &&
        wavData[i + 1] === 0x61 &&
        wavData[i + 2] === 0x74 &&
        wavData[i + 3] === 0x61
      ) {
        // Found "data" chunk, audio data starts 8 bytes later
        const audioDataStart = i + 8;
        console.log(`Landing page: Found audio data at offset ${audioDataStart}`);
        return wavData.slice(audioDataStart);
      }
    }

    // If no data chunk is found, return the original buffer
    return wavData;
  }

  // Create continuous audio buffer from raw PCM segments
  private async createContinuousAudioBuffer(rawAudioSegments: ArrayBuffer[]): Promise<AudioBuffer> {
    const sourceSampleRate = 44100;
    const targetSampleRate = this.audioContext!.sampleRate;

    const totalSampleCount = rawAudioSegments.reduce((sum, segment) => {
      const segmentSamples = segment.byteLength / 2; // 16-bit samples = 2 bytes
      return sum + Math.round(segmentSamples * targetSampleRate / sourceSampleRate);
    }, 0);

    console.log(`Landing page: Creating continuous buffer: ${totalSampleCount} samples from ${rawAudioSegments.length} segments`);

    const audioBuffer = this.audioContext!.createBuffer(1, totalSampleCount, targetSampleRate);
    const channelData = audioBuffer.getChannelData(0);

    // Crossfade duration: 5ms to eliminate clicks/pops
    const crossfadeSamples = Math.floor(targetSampleRate * 0.005);

    let currentIndex = 0;
    for (let segmentIdx = 0; segmentIdx < rawAudioSegments.length; segmentIdx++) {
      const segment = rawAudioSegments[segmentIdx];
      const int16Array = new Int16Array(segment);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0; // Normalize to [-1, 1]
      }

      let processedArray: Float32Array;
      if (targetSampleRate === sourceSampleRate) {
        processedArray = float32Array;
      } else {
        const resampledLength = Math.round(float32Array.length * targetSampleRate / sourceSampleRate);
        const resampled = new Float32Array(resampledLength);
        const last = float32Array.length - 1;
        for (let i = 0; i < resampledLength; i++) {
          const t = i * last / (resampledLength - 1);
          const idx = Math.floor(t);
          const frac = t - idx;
          const next = Math.min(idx + 1, last);
          resampled[i] = float32Array[idx] * (1 - frac) + float32Array[next] * frac;
        }
        processedArray = resampled;
      }

      // Apply crossfade if not the first segment
      if (segmentIdx > 0 && currentIndex >= crossfadeSamples) {
        const fadeStart = currentIndex - crossfadeSamples;
        const crossfadeLength = Math.min(crossfadeSamples, processedArray.length);
        
        // Apply crossfade for the overlapping region
        for (let i = 0; i < crossfadeLength; i++) {
          const fadeRatio = i / crossfadeSamples;
          const existingValue = channelData[fadeStart + i];
          const newValue = processedArray[i];
          // Crossfade: fade out existing, fade in new
          channelData[fadeStart + i] = existingValue * (1 - fadeRatio) + newValue * fadeRatio;
        }
        
        // Copy remaining samples after crossfade (if any)
        if (processedArray.length > crossfadeSamples) {
          channelData.set(processedArray.subarray(crossfadeSamples), currentIndex);
          currentIndex += processedArray.length - crossfadeSamples;
        } else {
          // Short segment: all samples were crossfaded, move index by non-overlapping portion
          currentIndex += Math.max(0, processedArray.length - crossfadeSamples);
        }
      } else {
        // First segment or not enough space for crossfade
        channelData.set(processedArray, currentIndex);
        currentIndex += processedArray.length;
      }
    }

    console.log(`Landing page: Continuous buffer created: ${audioBuffer.duration.toFixed(3)}s`);
    return audioBuffer;
  }

  // Continuous buffer processing with zero-click approach
  private async processGaplessAudioQueue() {
    if (this.isPlayingAudio || this.audioQueue.length === 0) {
      if (this.isPlayingAudio) console.log("Landing page: Continuous audio system active.");
      if (this.audioQueue.length === 0) console.log("Landing page: Continuous queue empty.");
      return;
    }

    // Initialize professional audio context
    this.initializeContinuousAudioContext();

    if (!this.audioContext) {
      console.error("Landing page: Cannot process gapless queue - audio context failed");
      return;
    }

    this.isPlayingAudio = true;
    console.log("Landing page: Starting continuous audio buffer playback...");
    
    // Collect all available segments for continuous playback
    const availableSegments = [...this.audioQueue];
    this.audioQueue = []; // Clear queue
    
    try {
      // Create one continuous buffer from all segments
      const continuousBuffer = await this.createContinuousAudioBuffer(availableSegments);
    
      // Create and configure source for continuous playback
      const source = this.audioContext.createBufferSource();
      source.buffer = continuousBuffer;
      source.connect(this.mainGainNode!);
      
      console.log(`Landing page: Playing continuous buffer: ${continuousBuffer.duration.toFixed(3)}s`);
      
      // Set up completion handler
      source.onended = () => {
        console.log("Landing page: Continuous buffer playback complete");
        this.isPlayingAudio = false;
        this.currentSource = null;
        // Check if more segments arrived during playback
        this.processGaplessAudioQueue();
      };
      
      // Start playback
      source.start();
      this.currentSource = source;
      
    } catch (error) {
      console.error('Landing page: Error in continuous buffer playback:', error);
      this.isPlayingAudio = false;
      // Try processing any remaining segments
      this.processGaplessAudioQueue();
    }
  }

  // Initialize audio context for continuous buffer playback
  private initializeContinuousAudioContext(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          latencyHint: 'interactive'
        });
        
        // Create main gain node for volume control
        this.mainGainNode = this.audioContext.createGain();
        this.mainGainNode.gain.setValueAtTime(1.0, this.audioContext.currentTime);
        this.mainGainNode.connect(this.audioContext.destination);
        
        console.log("Landing page: Continuous audio context initialized for zero-click playback");
      } catch (error) {
        console.warn("Landing page: Failed to initialize continuous audio context:", error);
      }
    }
  }

  // Hume-compliant interruption handling with continuous buffer system
  private handleAudioInterruption(): void {
    console.log("Landing page: Handling interruption in continuous buffer system...");
    
    // Clear the queue immediately
    this.audioQueue = [];
    
    if (this.currentSource) {
      // Apply smooth fadeout as recommended by Hume
      if (this.mainGainNode && this.audioContext) {
        const currentTime = this.audioContext.currentTime;
        if (import.meta.env.DEV) console.log("Landing page: Applying Hume-recommended fadeout to continuous buffer...");
        
        // Brief fadeout (50ms for responsiveness)
        this.mainGainNode.gain.cancelScheduledValues(currentTime);
        this.mainGainNode.gain.setValueAtTime(this.mainGainNode.gain.value, currentTime);
        this.mainGainNode.gain.exponentialRampToValueAtTime(0.001, currentTime + 0.05);
        
        // Clean stop after fadeout
        setTimeout(() => {
          if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource = null;
          }
          this.isPlayingAudio = false;
          this.resetGainNodes();
        }, 60);
      } else {
        // Fallback: immediate stop
        this.currentSource.stop();
        this.currentSource = null;
        this.isPlayingAudio = false;
      }
    }
  }

  // Reset gain nodes to prevent audio artifacts
  private resetGainNodes(): void {
    if (this.audioContext && this.mainGainNode) {
      const currentTime = this.audioContext.currentTime;
      this.mainGainNode.gain.cancelScheduledValues(currentTime);
      this.mainGainNode.gain.setValueAtTime(1.0, currentTime);
    }
  }

  // Send user text messages to EVI
  public async sendMessage(message: string): Promise<boolean> {
    if (!this.evi || !this.evi.socket) {
      console.warn('Landing page: Cannot send message: No active Hon session or socket.');
      return false;
    }
    try {
      console.log('Landing page: Sending user text message to Hon:', message);
      const messagePayload = JSON.stringify({
        type: 'user_input',
        text: message
      });
      this.evi.socket.send(messagePayload);
      return true;
    } catch (error) {
      console.error('Landing page: Failed to send text message to Hon:', error);
      return false;
    }
  }

  // Start audio capture following Hume recommendations
  public async startAudioCapture(): Promise<boolean> {
    if (this.isMuted) {
      console.log("Landing page: startAudioCapture: Cannot start - User is muted.");
      return false;
    }

    console.log("Landing page: startAudioCapture: Attempting to start audio capture..."); 

    if (this.isCapturingAudio) {
      console.warn('Landing page: startAudioCapture: Cannot start - Already capturing audio.');
      return false;
    }
    if (!this.evi) {
        console.warn('Landing page: startAudioCapture: Cannot start - EVI connection is not active (this.evi is null).');
        return false;
    }
     if (this.currentStatus !== 'active') {
        console.warn(`Landing page: startAudioCapture: Cannot start - Current status is '${this.currentStatus}', not 'active'.`);
        return false;
     }
    console.log("Landing page: startAudioCapture: Initial checks passed.");

    try {
      if (import.meta.env.DEV) console.log("Landing page: startAudioCapture: Calling navigator.mediaDevices.getUserMedia with Hume-recommended constraints..."); 
      // Enhanced audio constraints per Hume documentation
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,  // Required by Hume for voice chat
          noiseSuppression: true,  // Required by Hume for voice chat
          autoGainControl: true,   // Required by Hume for voice chat
          sampleRate: 16000,       // Hume recommended for speech
          channelCount: 1          // Mono for voice as per Hume docs
        }
      });
      if (import.meta.env.DEV) console.log('Landing page: startAudioCapture: Hume-compliant microphone access granted. Stream:', this.mediaStream); 

      console.log("Landing page: startAudioCapture: Creating MediaRecorder..."); 
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      console.log("Landing page: startAudioCapture: MediaRecorder created:", this.mediaRecorder); 

      this.mediaRecorder.ondataavailable = async (event: BlobEvent) => { 
        if (event.data.size > 0 && this.evi) {
          try {
             const encodedAudioData = await convertBlobToBase64(event.data);
             this.evi.sendAudioInput({ data: encodedAudioData });
          } catch (error) {
            console.error('Landing page: startAudioCapture (ondataavailable): Error encoding or sending audio chunk:', error);
            this.stopAudioCapture(); 
          }
        } else if (!this.evi) {
            console.warn("Landing page: startAudioCapture (ondataavailable): Audio data available but EVI session ended. Stopping capture.");
            this.stopAudioCapture();
        }
      };

      this.mediaRecorder.onerror = (event: Event) => {
        console.error('Landing page: startAudioCapture (onerror): MediaRecorder error:', event);
        this.stopAudioCapture();
      };

      this.mediaRecorder.onstart = () => {
        console.log('Landing page: startAudioCapture (onstart): Audio capture started event received.'); 
        this.isCapturingAudio = true;
        this.updateVisualIndicator(true, 'listening');
      };

      this.mediaRecorder.onstop = () => {
        console.log('Landing page: startAudioCapture (onstop): Audio capture stopped event received.'); 
        this.isCapturingAudio = false;
         this.mediaStream?.getTracks().forEach(track => track.stop());
         this.mediaStream = null;
         this.mediaRecorder = null;
         console.log('Landing page: startAudioCapture (onstop): Cleaned up stream and recorder.');
      };

      // Start with 100ms intervals as recommended by Hume for web
      if (import.meta.env.DEV) console.log("Landing page: startAudioCapture: Starting MediaRecorder with Hume-recommended 100ms intervals...");
      this.mediaRecorder.start(100);
      console.log('Landing page: startAudioCapture: MediaRecorder started successfully.');
      return true;
    } catch (error) {
      console.error('Landing page: startAudioCapture: Failed to start audio capture:', error);
      this.stopAudioCapture();
      return false;
    }
  }

  // Stop audio capture with proper cleanup
  public stopAudioCapture(): void {
    console.log("Landing page: stopAudioCapture: Attempting to stop audio capture...");
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      console.log("Landing page: stopAudioCapture: Stopping MediaRecorder...");
      this.mediaRecorder.stop();
    } else {
      console.log("Landing page: stopAudioCapture: MediaRecorder is already inactive or null.");
    }

    if (this.mediaStream) {
      console.log("Landing page: stopAudioCapture: Stopping media stream tracks...");
      this.mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log(`Landing page: stopAudioCapture: Stopped track: ${track.kind}`);
      });
      this.mediaStream = null;
    }

    this.isCapturingAudio = false;
    this.mediaRecorder = null;
    console.log("Landing page: stopAudioCapture: Audio capture stopped and cleaned up.");
  }

  // Getters for current state
  public get status(): LandingHonSessionStatus {
    return this.currentStatus;
  }

  public get isSessionActive(): boolean {
    return this.currentStatus === 'active';
  }

  public get isMutedState(): boolean {
    return this.isMuted;
  }
}

// Export singleton instance
export const landingPageHumeService = new LandingPageHumeService(); 
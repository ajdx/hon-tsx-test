import { Hume, HumeClient, convertBlobToBase64 } from 'hume';
import { Panel, Template } from '../types';
import { useComicStore, State } from '../store/useComicStore';
import { fal } from '@fal-ai/client'; // Keep if needed for other things, but captioning uses backend
import { Buffer } from 'buffer'; // Keep if needed for other things
import { fluxDevService } from './fluxDevService';
import { fluxKontextService } from './fluxKontextService';
import { fluxKreaService, StreamProgressEvent } from './fluxKreaService';
import { nanoid } from 'nanoid';

// Define types for our EVI service
export type HonSessionStatus = 'idle' | 'connecting' | 'active' | 'error';
export type HonProcessingState = 'idle' | 'processing' | 'generating' | 'editing' | 'dreaming' | 'inspiring' | 'reasoning';

// Removed ScreenState interface as we rely on getCanvasState tool now

// Create a service class for Hume EVI integration
export class HumeEviService {
  private humeClient: HumeClient | null = null; // Can potentially be removed if only using connect
  private evi: Hume.empathicVoice.chat.ChatSocket | null = null;
  private isActive: boolean = false;
  private statusChangeCallbacks: ((status: HonSessionStatus) => void)[] = [];
  private visualIndicatorCallbacks: ((isActive: boolean, processingState: HonProcessingState) => void)[] = [];
  private currentStatus: HonSessionStatus = 'idle';
  private processingState: HonProcessingState = 'idle';
  private activeToolCalls: Set<string> = new Set(); // Track active tool calls
  
  // Continuous audio system for zero-click playback (optimized like landing page)
  private audioQueue: ArrayBuffer[] = [];
  private isPlayingAudio: boolean = false;
  private audioContext: AudioContext | null = null;
  private mainGainNode: GainNode | null = null;
  private currentSource: AudioBufferSourceNode | null = null;

  // Microphone input state
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private isCapturingAudio: boolean = false;
  private isMuted: boolean = false; // Added mute state

  constructor() {
    // Service initialization (debug logs removed for production)
    this.wsUrl = null;
  }

  // Subscribe to status changes
  public onStatusChange(callback: (status: HonSessionStatus) => void) {
    this.statusChangeCallbacks.push(callback);
    callback(this.currentStatus); // Initial call with current status
    return () => {
      this.statusChangeCallbacks = this.statusChangeCallbacks.filter(cb => cb !== callback);
    };
  }

  // Subscribe to visual indicator changes
  public onVisualIndicatorChange(callback: (isActive: boolean, processingState: HonProcessingState) => void) {
    this.visualIndicatorCallbacks.push(callback);
    callback(this.isActive, this.processingState); // Initial call with current status
    return () => {
      this.visualIndicatorCallbacks = this.visualIndicatorCallbacks.filter(cb => cb !== callback);
    };
  }

  // Update status and notify listeners
  private updateStatus(status: HonSessionStatus) {
    this.currentStatus = status;
    this.statusChangeCallbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error in status change callback:', error);
      }
    });
  }

  // Update visual indicator and notify listeners with processing state
  private updateVisualIndicator(isActive: boolean, processingState: HonProcessingState = 'idle') {
    this.isActive = isActive;
    this.processingState = processingState;
    this.visualIndicatorCallbacks.forEach(callback => {
      try {
        callback(isActive, processingState);
      } catch (error) {
        console.error('Error in visual indicator callback:', error);
      }
    });
  }

  // Helper method to complete a tool call and potentially return to idle
  private completeToolCall(toolCallId: string) {
    if (toolCallId && this.activeToolCalls.has(toolCallId)) {
      this.activeToolCalls.delete(toolCallId);
      console.log(`Completed tool call ${toolCallId}. Remaining active tools: ${this.activeToolCalls.size}`);
      
      // If no more active tool calls, return to idle
      if (this.activeToolCalls.size === 0) {
        console.log('All tool calls completed, returning to idle state');
        this.updateVisualIndicator(true, 'idle');
      }
    }
  }

  // --- REMOVED Screen State Update Methods ---
  // public updateScreenState(...) {}
  // public updateCurrentPage(...) {}
  // public updateSelectedPanel(...) {}
  // public updatePanels(...) {}
  // public updateTemplate(...) {}
  // public updateUserAction(...) {}
  // public sendScreenStateEvent(...) {} // Also removed debounced sender



  // Start a session with Hon - USES TOKEN AUTH
  public async startSession(): Promise<boolean> {
    if (this.currentStatus === 'connecting' || this.currentStatus === 'active') {
      console.warn('Session already connecting or active.');
      return this.currentStatus === 'active';
    }

    try {
      this.updateStatus('connecting');

      // 1. Fetch access token from backend
      if (import.meta.env.DEV) console.log('Fetching Hume access token...');
      const tokenResponse = await fetch('/api/hume/generate-token', { method: 'POST' });
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({ error: 'Failed to parse token error response' }));
        throw new Error(`Failed to fetch Hume token: ${tokenResponse.status} - ${errorData?.error || 'Unknown error'}`);
      }
      const { accessToken, configId } = await tokenResponse.json();
      if (!accessToken || !configId) {
        throw new Error('Received null or undefined access token/config from backend.');
      }
      if (import.meta.env.DEV) console.log('Successfully fetched Hume access token and config ID.');

      // 2. Connect to EVI using the token and secure config ID from backend
      const tempClient = new HumeClient({ accessToken });
      this.evi = await tempClient.empathicVoice.chat.connect({
        configId: configId,
      });
      console.log("EVI chat.connect call completed using access token.");

      // Set up the persistent event handlers immediately after connect returns
      this.setupEventHandlers();
      console.log("Persistent event handlers set up.");
      
      // Remove immediate audio capture start - let the 'open' event handler do it
      // The 'open' event will automatically start audio capture when connection is truly active

      // Add a connection timeout safety check
      setTimeout(() => {
        if (this.currentStatus === 'connecting') {
          console.warn('Connection timeout - still in connecting state after 30 seconds');
          this.updateStatus('error');
        }
      }, 30000);

      return true;

    } catch (error) {
      console.error('Failed to start Hon session:', error);
      this.updateStatus('error'); // Update status on error
      this.evi = null; // Ensure evi is null if connect failed
      return false; // Return false on exception
    }
  }

  // End the session with Hon
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
        console.log("Attempting to close EVI socket...");
        // Hume SDK might have a disconnect method, prefer that if available
        if (typeof (this.evi as any).disconnect === 'function') {
           (this.evi as any).disconnect(); // Prefer SDK disconnect
        } else {
           this.evi.socket.close(); // Fallback to raw socket close
        }
      } else {
        console.warn("Cannot explicitly close socket: evi or evi.socket is null.");
      }

      // Nullify evi AFTER attempting close
      this.evi = null;
      this.updateStatus('idle');
      this.updateVisualIndicator(false);
      console.log("EVI session ended and cleaned up.");
      return true;
    } catch (error) {
      console.error('Failed to end Hon session:', error);
      // Still nullify and update status on error
      this.evi = null;
      this.updateStatus('error'); // Or 'idle' depending on desired state after failed end
      this.updateVisualIndicator(false);
      return false;
    }
  }

  // Toggle Mute state
  public async toggleMute(): Promise<void> {
    this.isMuted = !this.isMuted;
    console.log(`Toggled mute state. isMuted is now: ${this.isMuted}`);
    if (this.isMuted) {
      this.stopAudioCapture();
    } else {
      // Only start capture if the session is actually active
      if (this.currentStatus === 'active') {
        await this.startAudioCapture();
      } else {
        console.log("toggleMute: Session not active, skipping audio capture start on unmute.");
      }
    }
    // Optional: Add a callback for mute state changes if UI needs it directly
    // this.notifyMuteStateChange(this.isMuted);
  }

  // Set up event handlers for the EVI session
  private setupEventHandlers() {
    // ... (rest of setupEventHandlers remains largely the same) ...
    if (!this.evi) {
      console.error("setupEventHandlers called but this.evi is null!");
      return;
    }
    console.log("Setting up persistent event handlers...");

    this.evi.on('open', () => {
      console.log('Persistent open handler fired.');
      this.updateStatus('active');
      this.updateVisualIndicator(true);
      // Start audio capture ONLY IF NOT MUTED
      if (!this.isMuted) {
        console.log('Connection is now active, starting audio capture...');
        this.startAudioCapture();
      } else {
        console.log("Connection active but user is muted, skipping audio capture start.");
      }
    });

    this.evi.on('close', () => {
      console.log('Persistent close handler fired.');
      this.updateStatus('idle');
      this.updateVisualIndicator(false);
      this.stopAudioCapture(); // Ensure capture stops on close
    });

    this.evi.on('error', (error: Error) => { 
      // Don't treat "unknown message type" as fatal errors - these are just new Hume features
      if (error.message && error.message.includes('unknown message type')) {
        if (import.meta.env.DEV) {
          console.warn('Ignoring unknown message type error - this is likely a new Hume feature:', error.message);
        }
        return; // Don't break the session for unknown message types
      }
      if (import.meta.env.DEV) {
        console.error('Persistent error handler fired:', error);
      }
      
      if (this.currentStatus !== 'error') {
        this.updateStatus('error');
      }
      this.updateVisualIndicator(false);
      this.stopAudioCapture(); // Ensure capture stops on error
    });

    this.evi.on('message', (event: any) => {
      if (!this.evi) {
        console.warn("Persistent message handler: Received message after EVI session ended. Ignoring.");
        return;
      }
      this.processIncomingMessage(event);
    });
  }

  // Extracted message processing logic
  private processIncomingMessage(event: any) {
    // ... (audio_output, user_message, assistant_message, chat_metadata, assistant_end handling remain the same) ...
     console.log(`processIncomingMessage: Received event type: ${event?.type}`, event);

    try {
      switch (event.type) {
        case 'audio_output':
          if (event.data && typeof event.data === 'string') {
            console.log('processIncomingMessage: Detected audio_output with base64 data.');
            this.updateVisualIndicator(true, 'inspiring');
            this.enqueueAudioSegment(event.data);
          } else {
            console.warn('processIncomingMessage: Received audio_output without valid base64 data.', event);
          }
          break;

        case 'assistant_message':
          // Update to indicate active state when message is being shown
          this.updateVisualIndicator(true, 'generating');
          console.log(`processIncomingMessage: Assistant message: Role=${event.message?.role}, Content type=${event.message?.content?.type}`);
          break;
          
        case 'user_message':
          // Set visual state to reasoning for new user input
          this.updateVisualIndicator(true, 'reasoning');
          console.log(`processIncomingMessage: User message: Role=${event.message?.role}, Content type=${event.message?.content?.type}`);
          
          // Log active tool calls to ensure transparency
          if (this.activeToolCalls.size > 0) {
            console.log(`processIncomingMessage: User spoke while ${this.activeToolCalls.size} tool calls active - tools will continue processing`);
          }
          
          // Handle audio interruption (but NOT tool call interruption)
          this.handleAudioInterruption();
          break;

        case 'user_interruption':
          console.log('processIncomingMessage: Received user_interruption event.');
          // Per Hume docs: stop current audio and clear queue on interruption
          this.handleAudioInterruption();
          break;

        case 'tool_call':
          // Set processing state when tool is being called
          this.updateVisualIndicator(true, 'processing');
          console.log(`processIncomingMessage: Detected tool_call: Name=${event.name}, ID=${event.tool_call_id || event.toolCallId}`);
          // Ensure we use the correct ID field name
          const toolCallId = event.tool_call_id || event.toolCallId;
          
          // Track this tool call as active
          if (toolCallId) {
            this.activeToolCalls.add(toolCallId);
            console.log(`Added tool call ${toolCallId} to active set. Active tools: ${this.activeToolCalls.size}`);
          } 
          if (event.name === 'getCanvasState') {
             // Pass the correct ID
            this.handleCanvasStateTool(toolCallId, event.parameters);
          } else if (event.name === 'canvas_editor_tool') {
            // Handle canvas editing (generate/edit images via voice commands)
            this.handleCanvasEditorTool(toolCallId, event.parameters);
          } else if (event.name === 'video_generator') {
            // Handle video generation from voice commands
            this.handleVideoGeneratorTool(toolCallId, event.parameters);
          } else if (event.name === 'getVideoContext') {
            // Handle video understanding/analysis
            this.handleVideoContextTool(toolCallId, event.parameters);
          } else {
            console.warn(`processIncomingMessage: Unhandled tool_call name: ${event.name}`);
            // Pass the correct ID
            this.sendToolErrorResponse(toolCallId, `Tool not implemented: ${event.name}`);
          }
          break;
        
        case 'chat_metadata':
          console.log('processIncomingMessage: Received chat_metadata event.');
          break;

        case 'assistant_end':
          console.log('processIncomingMessage: Received assistant_end event.');
          // Only return to idle if no tools are actively being processed
          if (this.activeToolCalls.size === 0) {
            console.log('No active tool calls, returning to idle state');
            this.updateVisualIndicator(true, 'idle');
          } else {
            console.log(`Still have ${this.activeToolCalls.size} active tool calls, keeping current state`);
          }
          // Continue processing queue if there are remaining segments
          this.processGaplessAudioQueue(); 
          break;


          
        default:
           console.warn("processIncomingMessage: Received message event without known type or data field:", event);
          break; 
      } 

    } catch (error) {
      console.error('processIncomingMessage: Error processing incoming message:', error);
    }
  }

  // Enqueue audio segments for gapless playback (exact same as landing page)
  private enqueueAudioSegment(base64Data: string) {
    try {
      console.log("Converting base64 to audio buffer for gapless queue...");
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Strip WAV header to get raw audio data (CRITICAL for preventing thumps)
      const rawAudioData = this.stripWavHeader(bytes);
      console.log(`Stripped WAV header, raw audio: ${rawAudioData.byteLength} bytes`);
      
      // Add to gapless queue and process
      this.audioQueue.push(rawAudioData.buffer);
      this.processGaplessAudioQueue();
    } catch (error) {
      console.error('Error converting base64 to audio buffer:', error);
    }
  }

  // Strip WAV header to get raw PCM data for seamless concatenation (exact same as landing page)
  private stripWavHeader(wavData: Uint8Array): Uint8Array {
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
      if (wavData[i] === 0x64 && wavData[i + 1] === 0x61 && 
          wavData[i + 2] === 0x74 && wavData[i + 3] === 0x61) {
        // Found "data" chunk, audio data starts 8 bytes later
        const audioDataStart = i + 8;
        console.log(`Found audio data at offset ${audioDataStart}`);
        return wavData.slice(audioDataStart);
      }
    }
    
    // Fallback: assume standard 44-byte header
    console.log("Using fallback 44-byte header strip");
    return wavData.slice(44);
  }

  // Handle audio interruptions (user speaking, interruption events)
  private handleAudioInterruption() {
    console.log("handleAudioInterruption: Stopping current audio and clearing queue");
    
    // Stop current audio source
    if (this.currentSource) {
      try {
        this.currentSource.stop();
        this.currentSource.disconnect();
      } catch (e) {
        console.warn("handleAudioInterruption: Error stopping audio source:", e);
      }
      this.currentSource = null;
    }
    
    // Clear audio queue and reset state
    this.audioQueue = [];
    this.isPlayingAudio = false;
    
    // IMPORTANT: Do NOT affect activeToolCalls - ongoing tool executions continue
    if (this.activeToolCalls.size > 0) {
      console.log(`handleAudioInterruption: ${this.activeToolCalls.size} tool calls still active - these will continue processing`);
    }
    
    console.log("handleAudioInterruption: Audio interrupted and queue cleared");
  }

  // Create continuous audio buffer from raw PCM segments (exact same as landing page)
  private async createContinuousAudioBuffer(rawAudioSegments: ArrayBuffer[]): Promise<AudioBuffer> {
    const sourceSampleRate = 44100;
    const targetSampleRate = this.audioContext!.sampleRate;

    const totalSampleCount = rawAudioSegments.reduce((sum, segment) => {
      const segmentSamples = segment.byteLength / 2; // 16-bit samples
      return sum + Math.round(segmentSamples * targetSampleRate / sourceSampleRate);
    }, 0);

    console.log(`Creating continuous buffer: ${totalSampleCount} samples from ${rawAudioSegments.length} segments`);

    const audioBuffer = this.audioContext!.createBuffer(1, totalSampleCount, targetSampleRate);
    const channelData = audioBuffer.getChannelData(0);

    let currentIndex = 0;
    for (const segment of rawAudioSegments) {
      const int16Array = new Int16Array(segment);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0; // Normalize to [-1, 1]
      }

      if (targetSampleRate === sourceSampleRate) {
        channelData.set(float32Array, currentIndex);
        currentIndex += float32Array.length;
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
        channelData.set(resampled, currentIndex);
        currentIndex += resampled.length;
      }
    }

    console.log(`Continuous buffer created: ${audioBuffer.duration.toFixed(3)}s`);
    return audioBuffer;
  }

  // Continuous buffer processing with zero-click approach (exact same as landing page)
  private async processGaplessAudioQueue() {
    if (this.isPlayingAudio || this.audioQueue.length === 0) {
      if (this.isPlayingAudio) console.log("Continuous audio system active.");
      if (this.audioQueue.length === 0) console.log("Continuous queue empty.");
      return;
    }

    // Initialize professional audio context
    this.initializeContinuousAudioContext();

    if (!this.audioContext) {
      console.error("Cannot process gapless queue - audio context failed");
      return;
    }

    this.isPlayingAudio = true;
    console.log("Starting continuous audio buffer playback...");
    
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
      
      console.log(`Playing continuous buffer: ${continuousBuffer.duration.toFixed(3)}s`);
      
      // Set up completion handler
      source.onended = () => {
        console.log("Continuous buffer playback complete");
        this.isPlayingAudio = false;
        this.currentSource = null;
        // Check if more segments arrived during playback
        this.processGaplessAudioQueue();
      };
      
      // Start playback
      source.start();
      this.currentSource = source;
      
    } catch (error) {
      console.error('Error in continuous buffer playback:', error);
      this.isPlayingAudio = false;
      // Try processing any remaining segments
      this.processGaplessAudioQueue();
    }
  }

  // Initialize audio context for continuous buffer playback (exact same as landing page)
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
        
        console.log("Continuous audio context initialized for zero-click playback");
      } catch (error) {
        console.warn("Failed to initialize continuous audio context:", error);
      }
    }
  }

  // --- REMOVED handleScreenStateTool ---

  // Handle getCanvasState tool call - Reads aiCaption FROM STORE STATE
  private async handleCanvasStateTool(toolCallId: string, parameters: any) {
    if (!this.evi || !this.evi.socket) {
      console.error("Cannot handle canvas state tool: evi or evi.socket is null.");
      return; 
    }
    

    
    // Show processing state for tool call
    this.updateVisualIndicator(true, 'reasoning');
    console.log(`📋 Handling getCanvasState tool call (ID: ${toolCallId}) - recording for workflow tracking`);
    console.log(`Parameters:`, parameters);
    
    try {
      let detail = 'full';
      try {
        if (parameters && typeof parameters === 'object' && parameters.detail) {
          detail = parameters.detail === 'basic' ? 'basic' : 'full';
        }
      } catch (e) {
        console.warn('Failed to parse tool parameters, defaulting to "full" detail:', e);
      }
      console.log(`Using detail level: ${detail}`);

      // Get current state from Zustand store (already includes aiCaption on panels)
      const state = useComicStore.getState() as State;
      const currentPage = state.currentPageIndex;
      const currentComic = state.currentComic;
      const currentPagePanels = currentComic ? currentComic.pages[currentPage] || [] : [];
      const currentTemplate = currentComic ? currentComic.pageTemplates?.[currentPage] || null : null;

      let responsePayload: any;

      if (detail === 'basic') {
        responsePayload = {
          currentPageIndex: currentPage,
          selectedPanelId: state.selectedPanelId, 
          panelCount: currentPagePanels.length,
          templateName: currentTemplate?.name || null,
          userActionType: state.currentUserAction?.type || null 
        };
      } else { // Full detail
        // Log the panels and their captions for debugging
        console.log("Current page panels with captions for Hon:");
        currentPagePanels.forEach(panel => {
          console.log(`Panel ${panel.id} - Type: ${panel.type}, Caption: "${panel.caption || 'none'}", AI Caption: "${panel.aiCaption || 'none'}", URL: ${panel.url ? panel.url.substring(0, 30) + '...' : 'none'}`);
        });
        
        // Check if any panels need captions (emergency fix - normally this should happen automatically)
        const panelsWithoutCaptions = currentPagePanels.filter(panel => 
          panel.type === 'image' && 
          panel.url && 
          (panel.url.startsWith('http') || panel.url.startsWith('blob:')) && 
          !panel.aiCaption && 
          !panel.captionAttempted
        );
        
        if (panelsWithoutCaptions.length > 0) {
          console.log(`⚠️ Found ${panelsWithoutCaptions.length} panels without captions. Triggering emergency caption fetch.`);
          // Switch to "dreaming" state while fetching captions
          this.updateVisualIndicator(true, 'dreaming');
          
          // Don't await these to avoid blocking the response
          panelsWithoutCaptions.forEach(panel => {
            // Use the store directly, not through state
            useComicStore.getState().fetchAndSetPanelAICaption(panel.id, currentPage);
          });
        }
        
        // Enhanced panel data with semantic references for better Hon integration
        const isCustomTemplate = currentTemplate?.id === 'custom';
        
        // Create ordered panel list for semantic referencing
        let orderedPanels: Panel[];
        if (isCustomTemplate) {
          // Custom templates: Use creation order (array order)
          orderedPanels = [...currentPagePanels];
        } else {
          // Regular templates: Sort by position (row, col) for grid order
          orderedPanels = [...currentPagePanels].sort((a, b) => {
            if (a.position.row !== b.position.row) {
              return a.position.row - b.position.row;
            }
            return a.position.col - b.position.col;
          });
        }
        
        // Prepare panels data with semantic references and editing context
        const panelsData = orderedPanels.map((panel, index) => {
          // Format captions differently based on availability
          let formattedCaption = panel.caption || '';
          let imageDescription = panel.aiCaption || '';
          
          // Determine if panel is suitable for editing
          const isEditable = panel.type === 'image' && !!panel.url;
          const hasContent = !!panel.url;
          
          // Build enhanced description with semantic referencing
          return {
            id: panel.id,
            semanticId: `panel-${index}`, // Hon can use this for targeting: "edit panel-0"
            type: panel.type,
            url: panel.url || '', // Keep full URL for video understanding tool
            urlPreview: panel.url?.substring(0, 50) + '...' || '', // Truncated for display
            caption: formattedCaption, // User-entered caption/prompt
            imageCaption: imageDescription, // AI-generated caption
            hasCaption: !!panel.aiCaption, // Boolean flag for easy checking
            position: panel.position,
            isEditable: isEditable, // Hon can prioritize editable panels
            hasContent: hasContent, // Whether panel has any content
            panelOrder: index + 1, // 1-based ordering for user-friendly references
            orderingStrategy: isCustomTemplate ? 'creation_order' : 'position_order'
          };
        });
        
        // Add enhanced editing context for Hon's decision making and workflow guidance
        const editablePanels = panelsData.filter(p => p.isEditable);
        const selectedPanelSemanticId = state.selectedPanelId ? 
          panelsData.find(p => p.id === state.selectedPanelId)?.semanticId : null;
        const mostRecentImagePanel = editablePanels.slice(-1)[0]?.semanticId || null;
        
        const editingContext = {
          editablePanels: editablePanels,
          editablePanelCount: editablePanels.length,
          selectedPanelSemanticId: selectedPanelSemanticId,
          mostRecentImagePanel: mostRecentImagePanel,
          recommendedEditTarget: selectedPanelSemanticId || mostRecentImagePanel,
          
          // Workflow guidance for Hon
          workflowGuidance: {
            nextAction: editablePanels.length > 0 ? 'ready_to_edit' : 'generate_content_first',
            editingInstructions: editablePanels.length > 0 
              ? `Use canvas_editor_tool with action="edit_image" and target_element_id="${selectedPanelSemanticId || mostRecentImagePanel}" to edit existing images`
              : 'No editable images found. Use canvas_editor_tool with action="generate_image" to create new content first',
            targetingNote: 'Always specify target_element_id using semantic IDs like panel-0, panel-1, etc. for accurate results'
          }
        };

        responsePayload = {
          currentPageIndex: currentPage,
          selectedPanelId: state.selectedPanelId,
          panels: panelsData, // Enhanced panels with semantic IDs and editing context
          editingContext: editingContext, // Guidance for Hon to make smart editing decisions
          template: currentTemplate ? { 
             id: currentTemplate.id,
             name: currentTemplate.name,
             rows: currentTemplate.layout.rows,
             cols: currentTemplate.layout.cols,
             isCustomTemplate: currentTemplate.id === 'custom'
          } : null,
          userAction: state.currentUserAction, 
          comicTitle: currentComic?.title || null,
          comicPageCount: currentComic?.pages.length || 0,
        };
      }

      const responseContent = JSON.stringify(responsePayload);
      
      if (!this.evi || !this.evi.socket) {
        console.warn("Cannot send tool response: Connection closed while preparing payload.");
        return; 
      }

      // Switch to inspiring state when sending the response
      this.updateVisualIndicator(true, 'inspiring');
      
      const response = JSON.stringify({
        type: 'tool_response',
        tool_call_id: toolCallId,
        content: responseContent 
      });
      console.log("Sending tool response (canvas state with panel captions) to Hon:", JSON.parse(response));
      this.evi.socket.send(response);
      
      // Mark this tool call as completed
      this.completeToolCall(toolCallId);
      
      // Keep inspiring state - let assistant_end event return to idle
      // this.updateVisualIndicator(true, 'idle'); // Removed for better timing
    } catch (error) {
      console.error('Error handling/sending canvas state tool response:', error);
      if (this.evi && this.evi.socket) { 
        this.sendToolErrorResponse(toolCallId, 'Failed to get canvas state');
      } else {
         console.error("Cannot send tool error response: Connection closed.");
      }
      // Return to idle processing state after error
      this.updateVisualIndicator(true, 'idle');
    }
  }

  // Handle canvas_editor_tool for voice commands (generate/edit images)
  private async handleCanvasEditorTool(toolCallId: string, parameters: any) {
    if (!this.evi || !this.evi.socket) {
      console.error("Cannot handle canvas editor tool: evi or evi.socket is null.");
      return; 
    }
    
    // Show processing state for image operations
    this.updateVisualIndicator(true, 'generating');
    console.log(`Handling canvas_editor_tool (ID: ${toolCallId}) with params:`, parameters);
    
    try {
      // Parse parameters if they come as a JSON string
      let parsedParams = parameters;
      if (typeof parameters === 'string') {
        try {
          parsedParams = JSON.parse(parameters);
          console.log('Parsed string parameters to object:', parsedParams);
        } catch (e) {
          console.error('Failed to parse parameters string:', e);
          throw new Error('Invalid parameters format');
        }
      }
      
      // Extract parameters from the tool call
      const action = parsedParams?.action;
      const prompt = parsedParams?.prompt;
      const target_element_id = parsedParams?.target_element_id;
      const image_url = parsedParams?.image_url;
      const output_parameters = parsedParams?.output_parameters;
      
      console.log('Extracted parameters:', { action, prompt, target_element_id, image_url });
      
      // Check if Hon is following proper workflow for editing
      if (action === 'edit_image' && target_element_id) {
        const timeSinceCanvasStateCall = Date.now() - this.lastCanvasStateCall;
        if (timeSinceCanvasStateCall < this.canvasStateCallThreshold) {
          console.log(`✅ GOOD WORKFLOW: Hon called getCanvasState ${Math.round(timeSinceCanvasStateCall / 1000)}s ago, then specified target_element_id="${target_element_id}" for editing. This ensures accurate targeting!`);
        }
      }
      
      if (!action || !prompt) {
        console.error('Parameter validation failed:', { action, prompt, parameters });
        throw new Error('Missing required parameters: action and prompt are required');
      }
      
      let resultUrl: string;
      
      if (action === 'generate_image') {
        // Use Flux.1 Krea for generation with streaming progress
        console.log(`Voice command: Generating image with Flux.1 Krea - prompt: "${prompt}"`);
        
        // Determine target panel ID for progress tracking
        const targetPanelId = target_element_id || `temp-panel-${Date.now()}`;
        
        // Use Flux.1 Krea with streaming progress that integrates with Hon indicator
        resultUrl = await fluxKreaService.generateWithStreaming(prompt, {
          image_size: 'landscape_4_3',
          num_inference_steps: 28,
          guidance_scale: 4.5,
          acceleration: 'regular'
        }, (event: StreamProgressEvent) => {
          // Handle streaming progress with Hon indicator integration
          if (event.type === 'progress') {
            console.log('Hon Voice: Flux Krea streaming progress:', event.message);
            
            // Update processing state based on progress
            if (event.status === 'starting') {
              this.updateVisualIndicator(true, 'processing');
              // Set panel-specific progress
              useComicStore.getState().setPanelGenerationProgress(targetPanelId, true, event.message || 'Initializing...');
            } else if (event.status === 'generating') {
              this.updateVisualIndicator(true, 'generating');
              // Update panel-specific progress with partial image
              useComicStore.getState().setPanelGenerationProgress(
                targetPanelId, 
                true, 
                event.message || 'Generating with Flux.1 Krea...', 
                event.partialImageUrl
              );
            }
            
          } else if (event.type === 'complete') {
            console.log('Hon Voice: Flux Krea generation completed');
            this.updateVisualIndicator(true, 'inspiring');
            // Keep progress active until panel is updated - will be cleared after updatePanel
          } else if (event.type === 'error') {
            console.error('Hon Voice: Flux Krea streaming error:', event.error);
            this.updateVisualIndicator(true, 'idle');
            // Clear panel-specific progress on error
            useComicStore.getState().clearPanelGenerationProgress(targetPanelId);
          }
        });
        
        // Update canvas with generated image
        const state = useComicStore.getState();
        const currentPage = state.currentPageIndex;
        
        if (target_element_id) {
          // Replace specific panel or find next available position
          const panels = state.currentComic?.pages[currentPage] || [];
          const targetPanel = this.findPanelBySemanticId(target_element_id, panels);
          
          if (targetPanel) {
            const updatedPanel = {
              ...targetPanel,
              url: resultUrl,
              caption: prompt
            };
            await state.updatePanel(updatedPanel, currentPage);
            console.log(`🎨 Panel ${target_element_id} successfully updated with image! Actual panel ID: ${targetPanel.id} at position [${targetPanel.position.row}, ${targetPanel.position.col}]`);
            // Clear panel progress after successful update
            useComicStore.getState().clearPanelGenerationProgress(targetPanelId);
          } else {
            console.warn(`Panel ${target_element_id} not found and no available positions - image generated but not placed`);
          }
        } else {
          // Create new panel
          const newPanel: Panel = {
            id: nanoid(),
            type: 'image',
            url: resultUrl,
            caption: prompt,
            size: 'medium',
            aspectRatio: 1,
            position: { row: 0, col: 0 }
          };
          await state.updatePanel(newPanel, currentPage);
          // Clear panel progress after successful update
          useComicStore.getState().clearPanelGenerationProgress(targetPanelId);
        }
        
      } else if (action === 'edit_image') {
        // Switch to editing state for green glow
        this.updateVisualIndicator(true, 'editing');
        
        // Use Flux Kontext Max for editing
        let editImageUrl = image_url;
        let resolvedTargetPanel: Panel | null = null;
        
        if (!editImageUrl) {
          const state = useComicStore.getState();
          const currentPage = state.currentPageIndex;
          const panels = state.currentComic?.pages[currentPage] || [];
          
          if (target_element_id) {
            // ✅ Good workflow: Hon specified a target panel (likely called getCanvasState first)
            resolvedTargetPanel = this.findPanelBySemanticId(target_element_id, panels);
            
            if (resolvedTargetPanel && resolvedTargetPanel.url) {
              editImageUrl = resolvedTargetPanel.url;
              console.log(`✅ Found image to edit from panel ${target_element_id}: ${editImageUrl.substring(0, 50)}... (panel ID: ${resolvedTargetPanel.id}, position: [${resolvedTargetPanel.position.row}, ${resolvedTargetPanel.position.col}])`);
            } else {
              console.error(`Could not find image to edit for target ${target_element_id}. Panel found: ${!!resolvedTargetPanel}, Panel has URL: ${!!resolvedTargetPanel?.url}`);
              throw new Error(`Could not find image to edit for panel ${target_element_id}`);
            }
          } else {
            // No target specified - provide helpful guidance and attempt fallback
            console.warn('⚠️ No target panel specified for image editing. Attempting fallback...');
            
            // Simple fallback: Use selected panel if available
            if (state.selectedPanelId) {
              resolvedTargetPanel = panels.find(p => p.id === state.selectedPanelId);
              if (resolvedTargetPanel && resolvedTargetPanel.url && resolvedTargetPanel.type === 'image') {
                editImageUrl = resolvedTargetPanel.url;
                console.log(`🔄 Fallback: Using currently selected panel ${state.selectedPanelId} for editing`);
              }
            }
            
            if (!editImageUrl) {
              throw new Error('No target panel specified for editing. Please call getCanvasState first to see available panels and their semantic IDs (panel-0, panel-1, etc.), then specify target_element_id in your editing request.');
            }
          }
        }
        
        if (!editImageUrl) {
          throw new Error('No image URL provided for editing');
        }
        
        console.log(`Voice command: Editing image with prompt: "${prompt}"`);
        
        // Use the production-ready service that calls FAL directly for Flux Kontext Max editing with timeout handling
        let editingFailed = false;
        let editErrorMessage = '';
        
        try {
          resultUrl = await fluxKontextService.editImage(prompt, editImageUrl);
          console.log("Image editing completed successfully, result ready:", resultUrl);
        } catch (error) {
          editingFailed = true;
          editErrorMessage = error instanceof Error ? error.message : 'Unknown editing error';
          console.warn(`🚨 Image editing failed: ${editErrorMessage}`);
          
          // Check if it's a timeout error and if we should try fallback
          const isTimeoutError = editErrorMessage.includes('timeout') || editErrorMessage.includes('timed out');
          
          if (isTimeoutError) {
            console.log(`⏰ Timeout detected - attempting to generate new image instead of editing for prompt: "${prompt}"`);
            // Fallback: Generate a new image with the editing prompt instead of editing the existing one
            try {
              resultUrl = await fluxKreaService.generateWithStreaming(prompt, {
                image_size: 'landscape_4_3',
                num_inference_steps: 28,
                guidance_scale: 4.5,
                acceleration: 'regular'
              });
              console.log("✅ Fallback generation completed, result ready:", resultUrl);
              editingFailed = false; // Reset since fallback succeeded
            } catch (fallbackError) {
              console.error(`❌ Fallback generation also failed: ${fallbackError}`);
              throw new Error(`Image editing timed out and fallback generation failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'}`);
            }
          } else {
            // For non-timeout errors, re-throw the original error
            throw error;
          }
        }
        
        // Update canvas with edited image - with enhanced fallback logic
        const state = useComicStore.getState();
        const currentPage = state.currentPageIndex;
        let panelUpdateSuccessful = false;
        let placementMessage = '';
        
        // Try to update the resolved target panel first
        if (resolvedTargetPanel) {
          try {
            const updatedPanel = {
              ...resolvedTargetPanel,
              url: resultUrl,
              caption: prompt
            };
            await state.updatePanel(updatedPanel, currentPage);
            panelUpdateSuccessful = true;
            placementMessage = `✏️ Panel successfully updated with ${editingFailed ? 'generated' : 'edited'} image! Panel ID: ${resolvedTargetPanel.id} at position [${resolvedTargetPanel.position.row}, ${resolvedTargetPanel.position.col}]`;
            console.log(placementMessage);
          } catch (updateError) {
            console.warn(`Failed to update target panel ${resolvedTargetPanel.id}: ${updateError}`);
            panelUpdateSuccessful = false;
          }
        }
        
        // If original panel update failed or no target was resolved, try fallback options
        if (!panelUpdateSuccessful) {
          const panels = state.currentComic?.pages[currentPage] || [];
          
          // Option 1: Try to find the target panel again if we have a target_element_id
          if (target_element_id && !resolvedTargetPanel) {
            const targetPanel = this.findPanelBySemanticId(target_element_id, panels);
            if (targetPanel) {
              try {
                const updatedPanel = {
                  ...targetPanel,
                  url: resultUrl,
                  caption: prompt
                };
                await state.updatePanel(updatedPanel, currentPage);
                panelUpdateSuccessful = true;
                placementMessage = `✏️ Panel ${target_element_id} successfully updated with ${editingFailed ? 'generated' : 'edited'} image! Actual panel ID: ${targetPanel.id} at position [${targetPanel.position.row}, ${targetPanel.position.col}]`;
                console.log(placementMessage);
              } catch (updateError) {
                console.warn(`Failed to update fallback target panel ${targetPanel.id}: ${updateError}`);
              }
            }
          }
          
          // Option 2: If we still haven't placed the content, find next available panel
          if (!panelUpdateSuccessful) {
            const nextAvailablePanel = this.findNextAvailablePanel(panels);
            if (nextAvailablePanel) {
              try {
                // Add the new panel to the store first, then update it with content
                await state.updatePanel(nextAvailablePanel, currentPage);
                const updatedNextPanel = {
                  ...nextAvailablePanel,
                  url: resultUrl,
                  caption: prompt
                };
                await state.updatePanel(updatedNextPanel, currentPage);
                panelUpdateSuccessful = true;
                placementMessage = `🎯 Content placed in next available panel at position [${nextAvailablePanel.position.row}, ${nextAvailablePanel.position.col}] - ID: ${nextAvailablePanel.id}`;
                console.log(placementMessage);
              } catch (updateError) {
                console.warn(`Failed to place content in next available panel: ${updateError}`);
              }
            }
          }
          
          // Option 3: Last resort - create a new panel at (0,0)
          if (!panelUpdateSuccessful) {
            try {
              const newPanel: Panel = {
                id: nanoid(),
                type: 'image',
                url: resultUrl,
                caption: prompt,
                size: 'medium',
                aspectRatio: 1,
                position: { row: 0, col: 0 }
              };
              await state.updatePanel(newPanel, currentPage);
              panelUpdateSuccessful = true;
              placementMessage = `📍 Created new panel with ${editingFailed ? 'generated' : 'edited'} image at default position [0, 0]`;
              console.log(placementMessage);
            } catch (updateError) {
              console.error(`❌ Failed to create new panel as last resort: ${updateError}`);
              throw new Error(`Content generation succeeded but panel placement failed completely: ${updateError}`);
            }
          }
        }
        
      } else {
        throw new Error(`Unsupported action: ${action}`);
      }
      
      // Send success response to Hon
      const responseContent = JSON.stringify({
        success: true,
        action,
        result_url: resultUrl,
        target_element_id,
        message: action === 'generate_image' 
          ? `Generated image with Flux.1 Krea: ${prompt}`
          : editingFailed 
            ? `Image editing timed out, generated new image instead: ${prompt}. ${placementMessage || 'Content placed successfully.'}`
            : `Edited image with Flux Kontext Max: ${prompt}. ${placementMessage || 'Content placed successfully.'}`
      });
      
      if (!this.evi || !this.evi.socket) {
        console.warn("Cannot send tool response: Connection closed while processing image.");
        return; 
      }
      
      // Switch to inspiring state when sending response (after processing is complete)
      this.updateVisualIndicator(true, 'inspiring');
      
      const response = JSON.stringify({
        type: 'tool_response',
        tool_call_id: toolCallId,
        content: responseContent 
      });
      
      console.log("Sending canvas editor tool response to Hon:", JSON.parse(response));
      this.evi.socket.send(response);
      
      // Mark this tool call as completed
      this.completeToolCall(toolCallId);
      
      // Keep inspiring state - let assistant_end event return to idle
      // this.updateVisualIndicator(true, 'idle'); // Removed for better timing
      
    } catch (error) {
      console.error('Error handling canvas editor tool:', error);
      if (this.evi && this.evi.socket) { 
        this.sendToolErrorResponse(toolCallId, `Canvas editor failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } else {
         console.error("Cannot send tool error response: Connection closed.");
      }
      // Return to idle state after error
      this.updateVisualIndicator(true, 'idle');
    }
  }

  // Handle video_generator tool call - Generate videos using Luma API
  private async handleVideoGeneratorTool(toolCallId: string, parameters: any) {
    if (!this.evi || !this.evi.socket) {
      console.error("Cannot handle video generator tool: evi or evi.socket is null.");
      return; 
    }
    
    // Show dreaming state for video generation
    this.updateVisualIndicator(true, 'dreaming');
    console.log(`Handling video_generator tool call (ID: ${toolCallId}) with params:`, parameters);
    
    try {
      // Parse parameters if they come as a string
      let parsedParams = parameters;
      if (typeof parameters === 'string') {
        try {
          parsedParams = JSON.parse(parameters);
        } catch (parseError) {
          throw new Error(`Failed to parse tool parameters: ${parseError}`);
        }
      }

      // Extract parameters using same pattern as image generation
      const { 
        prompt = '', 
        target_element_id,
        start_image_url,
        end_image_url,
        mode = 'text-to-video',
        operation_type = 'text_to_video',
        ...otherParams 
      } = parsedParams || {};

      console.log(`Video generation parameters:`, { 
        prompt: prompt.substring(0, 100), 
        target_element_id, 
        operation_type,
        hasStartImage: !!start_image_url 
      });
      
      // Use same simple logic as image generation - no complex parsing
      const detectedPanelId = target_element_id;
      const detectedImageUrl = start_image_url;
      const finalOperationType = start_image_url ? 'image_to_video' : 'text_to_video';



      console.log('Video generation logic results:', {
        detectedPanelId,
        detectedImageUrl: detectedImageUrl ? detectedImageUrl.substring(0, 30) + '...' : 'none',
        finalOperationType
      });

      // Prepare the API request
      const apiPayload = {
        prompt,
        operation_type: finalOperationType,
        target_element_id: detectedPanelId,
        start_image_url: detectedImageUrl,
        end_image_url,
        ...otherParams
      };

      console.log('Sending video generation request to API:', {
        ...apiPayload,
        start_image_url: apiPayload.start_image_url ? apiPayload.start_image_url.substring(0, 30) + '...' : 'none'
      });

      // Determine which Seedance endpoint to use
      const isImageToVideo = finalOperationType === 'image_to_video' && detectedImageUrl;
      const seedanceEndpoint = isImageToVideo ? '/api/seedance/image-to-video' : '/api/seedance/text-to-video';
      
      // Prepare Seedance-specific payload
      const seedancePayload = {
        prompt,
        ...(isImageToVideo && { image_url: detectedImageUrl }),
        ...(end_image_url && { end_image_url }),
        aspect_ratio: otherParams.aspect_ratio || '16:9',
        resolution: otherParams.resolution || '720p',
        duration: otherParams.duration || '5',
        camera_fixed: otherParams.camera_fixed || false,
        ...(otherParams.seed !== undefined && { seed: otherParams.seed })
      };

      console.log(`Using Seedance endpoint: ${seedanceEndpoint}`, {
        ...seedancePayload,
        image_url: seedancePayload.image_url ? seedancePayload.image_url.substring(0, 30) + '...' : undefined
      });

      // Make the API call to Seedance
      const response = await fetch(seedanceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seedancePayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(`Video generation failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Seedance video generation initiated:', {
        request_id: result.request_id,
        status: result.status,
        model: result.model
      });

      // Always start polling for video completion (keep indicator in dreaming state)
      this.pollSeedanceVideoCompletion(
        toolCallId, 
        result.request_id, 
        isImageToVideo ? 'image-to-video' : 'text-to-video',
        finalOperationType,
        detectedPanelId
      );

      // DON'T send success response yet - wait for video completion!

    } catch (error) {
      console.error('Video generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Video generation failed';
      this.sendToolErrorResponse(toolCallId, errorMessage);
    }
    // Note: Don't reset indicator here - let polling system handle state when video completes
  }

  // Helper function to convert semantic panel IDs to actual panels
  private findPanelBySemanticId(semanticId: string, panels: Panel[]): Panel | null {
    // Handle semantic IDs like "panel-0", "panel-1", "panel_0", "panel_1", etc.
    // Support both hyphen and underscore formats for maximum compatibility
    const panelMatch = semanticId.match(/^panel[-_](\d+)$/);
    if (panelMatch) {
      const panelIndex = parseInt(panelMatch[1], 10);
      
      // Get the current template to determine if it's a custom template
      const state = useComicStore.getState();
      const currentTemplate = state.currentComic?.pageTemplates[state.currentPageIndex];
      const isCustomTemplate = currentTemplate?.id === 'custom';
      
      let sortedPanels: Panel[];
      
      if (isCustomTemplate) {
        // For custom templates: Use creation order (array index represents creation order)
        // "first panel" = panels[0], "second panel" = panels[1], etc.
        sortedPanels = [...panels]; // Keep original array order (creation order)
        console.log(`Custom template detected - using creation order for panel resolution`);
      } else {
        // For regular templates: Sort by position (row first, then column) for consistent grid ordering  
        // "first panel" = top-left, "second panel" = next in reading order, etc.
        sortedPanels = [...panels].sort((a, b) => {
          if (a.position.row !== b.position.row) {
            return a.position.row - b.position.row;
          }
          return a.position.col - b.position.col;
        });
        console.log(`Regular template detected - using position-based sorting for panel resolution`);
      }
      
      // Return the panel at the specified index
      if (panelIndex >= 0 && panelIndex < sortedPanels.length) {
        const resolvedPanel = sortedPanels[panelIndex];
        console.log(`Resolved semantic ID "${semanticId}" to panel with actual ID "${resolvedPanel.id}" at position [${resolvedPanel.position.row}, ${resolvedPanel.position.col}] (${isCustomTemplate ? 'custom template - creation order' : 'regular template - position order'})`);
        return resolvedPanel;
      } else {
        console.warn(`Panel index ${panelIndex} out of range (available: 0-${sortedPanels.length - 1}) for ${isCustomTemplate ? 'custom' : 'regular'} template`);
        
        // FALLBACK: If the requested panel index is out of range, try to find next available empty panel
        console.log(`Attempting fallback: finding next available empty panel for failed lookup "${semanticId}"`);
        return this.findNextAvailablePanel(panels);
      }
    }
    
    // If not a semantic ID, try to find by actual ID
    const directMatch = panels.find(p => p.id === semanticId);
    if (directMatch) {
      return directMatch;
    }
    
    // FALLBACK: If no direct match, try to find next available empty panel
    console.log(`Panel ID "${semanticId}" not found, attempting to find next available empty panel`);
    return this.findNextAvailablePanel(panels);
  }

  // Helper function to find the next available empty panel position
  private findNextAvailablePanel(existingPanels: Panel[]): Panel | null {
    const state = useComicStore.getState();
    const currentTemplate = state.currentComic?.pageTemplates[state.currentPageIndex];
    
    if (!currentTemplate) {
      console.warn('No template found for finding next available panel');
      return null;
    }

    if (currentTemplate.id === 'custom') {
      // For custom templates: Just return null as we can't auto-place panels in free-form layouts
      console.log('Custom template - cannot auto-place panel, user must specify position');
      return null;
    }

    // For regular templates: Find next empty position in the template layout
    const usedPositions = existingPanels.map(p => `${p.position.row}-${p.position.col}`);
    const nextPosition = currentTemplate.layout.areas.find((area: any) => 
      !usedPositions.includes(`${area.position.row}-${area.position.col}`)
    )?.position;

    if (nextPosition) {
      // Create a panel object representing the next available position
      // This will be used as a template for content placement
      const nextPanel: Panel = {
        id: nanoid(), // Generate new ID
        type: 'image', // Will be updated when content is placed
        url: '', // Will be updated when content is placed
        caption: '',
        size: 'medium',
        aspectRatio: 1,
        position: nextPosition
      };
      
      console.log(`Found next available panel position: [${nextPosition.row}, ${nextPosition.col}] (generated ID: ${nextPanel.id})`);
      return nextPanel;
    }

    console.warn('No available panel positions found in template layout');
    return null;
  }

  // New method: Poll Seedance video completion with improved state management
  private async pollSeedanceVideoCompletion(
    toolCallId: string,
    requestId: string, 
    modelType: 'text-to-video' | 'image-to-video',
    operationType: string,
    targetPanelId?: string
  ) {
    const maxAttempts = 60; // 5 minutes at 5-second intervals
    let attempts = 0;

    console.log(`Starting Seedance video polling for request ${requestId} (${modelType})`);

    const poll = async (): Promise<void> => {
      if (attempts >= maxAttempts) {
        console.warn(`Seedance video polling timed out for request ${requestId}`);
        this.updateVisualIndicator(true, 'idle');
        this.sendToolErrorResponse(toolCallId, 'Video generation timed out. Please try again.');
        return;
      }

      attempts++;
      
      try {
        // Check video status via Seedance status API
        const statusResponse = await fetch(`/api/seedance/status?request_id=${requestId}&model_type=${modelType}`);
        
        if (!statusResponse.ok) {
          console.warn(`Failed to check Seedance video status: ${statusResponse.status}`);
          setTimeout(poll, 5000);
          return;
        }

        const statusResult = await statusResponse.json();
        console.log(`Seedance video status check ${attempts}/${maxAttempts}:`, {
          request_id: requestId,
          status: statusResult.status,
          hasVideoUrl: !!statusResult.video_url
        });

        if (statusResult.status === 'COMPLETED' && statusResult.video_url) {
          // Video is ready! 
          console.log(`✅ Seedance video completed! Full response:`, statusResult);
          console.log(`Video URL: ${statusResult.video_url}`);
          
          // Update panel using same logic as image generation
          const state = useComicStore.getState();
          const currentPage = state.currentPageIndex;
          
          if (targetPanelId) {
            // Replace specific panel or find next available position
            const panels = state.currentComic?.pages[currentPage] || [];
            const targetPanel = this.findPanelBySemanticId(targetPanelId, panels);
            
            if (targetPanel) {
              const updatedPanel = {
                ...targetPanel,
                url: statusResult.video_url,
                type: 'video' as const
              };
              await state.updatePanel(updatedPanel, currentPage);
              console.log(`🎬 Panel ${targetPanelId} successfully updated with video! Actual panel ID: ${targetPanel.id} at position [${targetPanel.position.row}, ${targetPanel.position.col}]`);
            } else {
              console.warn(`Panel ${targetPanelId} not found and no available positions - video generated but not placed`);
            }
          } else {
            // Create new panel (same as image generation)
            const newPanel: Panel = {
              id: nanoid(),
              type: 'video',
              url: statusResult.video_url,
              caption: '',
              size: 'medium',
              aspectRatio: 1,
              position: { row: 0, col: 0 }
            };
            await state.updatePanel(newPanel, currentPage);
            console.log(`🎬 New panel created with video!`);
          }
          
          // Video generation complete - return to idle state and send success to Hume
          this.updateVisualIndicator(true, 'idle');
          this.sendToolSuccessResponse(toolCallId, 
            operationType === 'image_to_video' 
              ? 'Your image has been converted to video!' 
              : 'Your video has been generated successfully!'
          );
          
        } else if (statusResult.status === 'FAILED') {
          console.error(`❌ Seedance video generation failed: ${statusResult.error || 'Unknown error'}`);
          
          // Video generation failed - return to idle state and send error to Hume
          this.updateVisualIndicator(true, 'idle');
          this.sendToolErrorResponse(toolCallId, `Video generation failed: ${statusResult.error || 'Unknown error'}`);
          
        } else {
          // Still processing, continue polling while keeping dreaming state
          console.log(`Seedance video still ${statusResult.status.toLowerCase()}... continuing to poll`);
          this.updateVisualIndicator(true, 'dreaming'); // Ensure we stay in dreaming state
          setTimeout(poll, 5000);
        }
        
      } catch (error) {
        console.error(`Error checking Seedance video status:`, error);
        
        // If we're not at max attempts, try again
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          this.updateVisualIndicator(true, 'idle');
          this.sendToolErrorResponse(toolCallId, 'Failed to check video generation status');
        }
      }
    };

    // Start polling immediately
    poll();
  }



  // Handle getVideoContext tool call - Analyze video content using video understanding
  private async handleVideoContextTool(toolCallId: string, parameters: any) {
    if (!this.evi || !this.evi.socket) {
      console.error("Cannot handle video context tool: evi or evi.socket is null.");
      return; 
    }
    
    // Show reasoning state for video analysis
    this.updateVisualIndicator(true, 'reasoning');
    console.log(`Handling getVideoContext tool call (ID: ${toolCallId}) with params:`, parameters);
    
    try {
      // Parse parameters if they come as a JSON string
      let parsedParams = parameters;
      if (typeof parameters === 'string') {
        try {
          parsedParams = JSON.parse(parameters);
          console.log('Parsed string parameters to object:', parsedParams);
        } catch (e) {
          console.error('Failed to parse parameters string:', e);
          throw new Error('Invalid parameters format');
        }
      }
      
      // Extract parameters from the tool call
      const video_url = parsedParams?.video_url;
      const prompt = parsedParams?.prompt || 'What is happening in this video?';
      const detail = parsedParams?.detail || 'full';
      
      console.log('Extracted video analysis parameters:', { video_url, prompt, detail });
      
      if (!video_url) {
        throw new Error('Missing required parameter: video_url');
      }

      if (!prompt) {
        throw new Error('Missing required parameter: prompt');
      }
      
      console.log(`🎬 Analyzing video content: "${video_url.substring(0, 50)}..." with prompt: "${prompt}"`);
      
      // Call our video understanding API
      const response = await fetch('/api/fal/video-understanding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl: video_url,
          prompt: prompt
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Video analysis failed: ${errorData.error || response.statusText}`);
      }

      const analysisResult = await response.json();
      
      if (!analysisResult.success || !analysisResult.analysis) {
        throw new Error('Invalid response from video analysis service');
      }

      console.log('✅ Video analysis completed:', analysisResult.analysis);

      // Send the analysis result back to Hume with clear instruction to immediately describe it
      const responseContent = `Video analysis complete. Immediately describe this to the user now:\n\n${analysisResult.analysis}\n\nPlease share these findings with the user right away.`;
      
      const toolResponse = JSON.stringify({
        type: 'tool_response',
        tool_call_id: toolCallId,
        content: responseContent
      });

      this.evi.socket.send(toolResponse);
      console.log(`📤 Sent video analysis response for tool call ${toolCallId}`);
      
      // Mark this tool call as completed
      this.completeToolCall(toolCallId);
      
      // Switch to inspiring state after analysis is complete and response sent
      this.updateVisualIndicator(true, 'inspiring');
      
      // Keep inspiring state - let assistant_end event return to idle
      // this.updateVisualIndicator(true, 'idle'); // Removed for better timing
      
    } catch (error) {
      console.error(`❌ Video context tool error (${toolCallId}):`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error analyzing video';
      this.sendToolErrorResponse(toolCallId, errorMessage, `Failed to analyze video content: ${errorMessage}`);
    }
  }

  // Helper for sending tool success responses
  private sendToolSuccessResponse(toolCallId: string, message: string) {
    if (!this.evi || !this.evi.socket) {
      console.error("Cannot send tool success response: evi or evi.socket is null.");
      return;
    }
    try {
      const successResponse = JSON.stringify({
        type: 'tool_response',
        tool_call_id: toolCallId,
        content: message
      });
      console.log("Sending tool success:", successResponse);
      this.evi.socket.send(successResponse);
      
      // Mark this tool call as completed
      this.completeToolCall(toolCallId);
    } catch (e) {
      console.error("Failed to send tool success response:", e);
      // Still complete the tool call to prevent hanging
      this.completeToolCall(toolCallId);
    }
  }

  // Helper for sending tool errors
  private sendToolErrorResponse(toolCallId: string, errorMsg: string, content?: string) {
    if (!this.evi || !this.evi.socket) {
      console.error("Cannot send tool error response: evi or evi.socket is null.");
      return;
    }
    try {
      const errorResponse = JSON.stringify({
        type: 'tool_error',
        tool_call_id: toolCallId,
        error: errorMsg,
        content: content || `Error processing tool call ${toolCallId}`
      });
      console.log("Sending tool error:", errorResponse);
      this.evi.socket.send(errorResponse);
      
      // Mark this tool call as completed even on error
      this.completeToolCall(toolCallId);
    } catch (e) {
      console.error("Failed to send tool error response:", e);
      // Still complete the tool call to prevent hanging
      this.completeToolCall(toolCallId);
    }
  }

  // Send user text messages
  public async sendMessage(message: string): Promise<boolean> {
    if (!this.evi || !this.evi.socket) {
      console.warn('Cannot send message: No active Hon session or socket.');
      return false;
    }
    try {
      console.log('Sending user text message to Hon:', message);
      const messagePayload = JSON.stringify({
        type: 'user_input',
        text: message
      });
      this.evi.socket.send(messagePayload);
      return true;
    } catch (error) {
      console.error('Failed to send text message to Hon:', error);
      return false;
    }
  }

  // Microphone capture methods
  public async startAudioCapture(): Promise<boolean> {
    // ADDED MUTE CHECK
    if (this.isMuted) {
      console.log("startAudioCapture: Cannot start - User is muted.");
      return false;
    }
    // ... (rest of startAudioCapture remains the same) ...
    console.log("startAudioCapture: Attempting to start audio capture..."); 

    if (this.isCapturingAudio) {
      console.warn('startAudioCapture: Cannot start - Already capturing audio.');
      return false;
    }
    if (!this.evi) {
        console.warn('startAudioCapture: Cannot start - EVI connection is not active (this.evi is null).');
        return false;
    }
     if (this.currentStatus !== 'active') {
        console.warn(`startAudioCapture: Cannot start - Current status is '${this.currentStatus}', not 'active'.`);
        return false;
     }
    console.log("startAudioCapture: Initial checks passed."); 

    try {
      if (import.meta.env.DEV) console.log("startAudioCapture: Calling navigator.mediaDevices.getUserMedia with Hume-recommended constraints..."); 
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
      if (import.meta.env.DEV) console.log('startAudioCapture: Hume-compliant microphone access granted. Stream:', this.mediaStream); 

      console.log("startAudioCapture: Creating MediaRecorder..."); 
      this.mediaRecorder = new MediaRecorder(this.mediaStream);
      console.log("startAudioCapture: MediaRecorder created:", this.mediaRecorder); 

      this.mediaRecorder.ondataavailable = async (event: BlobEvent) => { 
        if (event.data.size > 0 && this.evi) {
          try {
             const encodedAudioData = await convertBlobToBase64(event.data);
             this.evi.sendAudioInput({ data: encodedAudioData });
          } catch (error) {
            console.error('startAudioCapture (ondataavailable): Error encoding or sending audio chunk:', error);
            this.stopAudioCapture(); 
          }
        } else if (!this.evi) {
            console.warn("startAudioCapture (ondataavailable): Audio data available but EVI session ended. Stopping capture.");
            this.stopAudioCapture();
        }
      };

      this.mediaRecorder.onerror = (event: Event) => {
        console.error('startAudioCapture (onerror): MediaRecorder error:', event);
        this.stopAudioCapture();
      };

      this.mediaRecorder.onstart = () => {
        console.log('startAudioCapture (onstart): Audio capture started event received.'); 
        this.isCapturingAudio = true;
      };

      this.mediaRecorder.onstop = () => {
        console.log('startAudioCapture (onstop): Audio capture stopped event received.'); 
        this.isCapturingAudio = false;
         this.mediaStream?.getTracks().forEach(track => track.stop());
         this.mediaStream = null;
         this.mediaRecorder = null;
         console.log('startAudioCapture (onstop): Cleaned up stream and recorder.');
      };

      console.log("startAudioCapture: Calling mediaRecorder.start(100)..."); 
      this.mediaRecorder.start(100);
      console.log("startAudioCapture: mediaRecorder.start(100) called."); 

      return true; 

    } catch (error) {
      console.error('startAudioCapture: Failed during getUserMedia or MediaRecorder setup:', error); 
      this.isCapturingAudio = false;
      if (this.mediaStream) {
           console.log("startAudioCapture (catch): Stopping media stream tracks due to error.");
           this.mediaStream.getTracks().forEach(track => track.stop());
           this.mediaStream = null;
      }
      this.mediaRecorder = null;
      return false; 
    }
  }

  public stopAudioCapture() {
    // ... (remains the same) ...
     console.log("stopAudioCapture: Attempting to stop audio capture..."); 
    if (!this.isCapturingAudio || !this.mediaRecorder) {
       console.log(`stopAudioCapture: Not stopping - isCapturingAudio: ${this.isCapturingAudio}, mediaRecorder exists: ${!!this.mediaRecorder}`); 
      return;
    }

    try {
      const currentState = this.mediaRecorder.state;
      console.log(`stopAudioCapture: Current MediaRecorder state: ${currentState}`); 
      if (currentState === 'recording' || currentState === 'paused') {
           console.log("stopAudioCapture: Calling mediaRecorder.stop()..."); 
           this.mediaRecorder.stop(); 
           console.log("stopAudioCapture: mediaRecorder.stop() called."); 
      } else {
           console.warn(`stopAudioCapture: MediaRecorder state is '${currentState}', not recording/paused. Performing manual cleanup.`); 
           this.isCapturingAudio = false;
           this.mediaStream?.getTracks().forEach(track => track.stop());
           this.mediaStream = null;
           this.mediaRecorder = null;
      }
    } catch (error) {
        console.error("stopAudioCapture: Error calling mediaRecorder.stop():", error); 
        this.isCapturingAudio = false;
        this.mediaStream?.getTracks().forEach(track => track.stop());
        this.mediaStream = null;
        this.mediaRecorder = null;
    }
  }
}

// Export a singleton instance
export const humeEviService = new HumeEviService(); 
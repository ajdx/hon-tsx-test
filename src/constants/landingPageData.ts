// ==========================================
// LANDING PAGE DATA CONSTANTS
// ==========================================

import type { AIModel, Story, FeatureVideos, ManifestoImages } from '../types/landingPage';

import veo3Logo from '../assets/veo3modelcion.png';
import fluxLogo from '../assets/fluxmodelcion.png';
import imagen4Logo from '../assets/image1modelcion.png';
import ray2Logo from '../assets/ray2modelcion.png';
import humeLogo from '../assets/humeoctavemodelcion.png';
import ideogramLogo from '../assets/ideogrammodelcion.png';
import runwayLogo from '../assets/runwaycion.png';
import elevenlabsLogo from '../assets/elevenlabscion.png';
import hunyuanLogo from '../assets/huanyuancion.png';
import pikaLogo from '../assets/pikacion.png';
import klingLogo from '../assets/klingcion.png';
import recraftLogo from '../assets/recraftcion.png';
import briaLogo from '../assets/briacion.jpg';
import seedanceLogo from '../assets/seedancecion.png';

// Hero background videos for carousel
export const HERO_VIDEOS = [
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1752858898/FqPKj1KI5HV4FNcHtvMJU_output_p8t1ol.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1752859141/BsspV_Josj-xALaEK_xMT_video_qathbs.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1752859660/5tt6T4GAbZH4ewMqLrABk_output_oncjxj.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1752858526/K91IQ7VbNji2R2_Zr-GtJ_output_rgp2df.mp4",
  "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1752860632/A9RxUxVBwM0WgfNIQw18m_output_mtzi9s.mp4"
];

// AI Model data with actual logo files
export const AI_MODELS: AIModel[] = [
  { name: 'Veo 3', logo: veo3Logo },
  { name: 'Flux', logo: fluxLogo },
  { name: 'Image-1', logo: imagen4Logo },
  { name: 'Ray 2', logo: ray2Logo },
  { name: 'Hume Octave', logo: humeLogo },
  { name: 'Ideogram', logo: ideogramLogo },
  { name: 'Runway', logo: runwayLogo },
  { name: 'Eleven Labs', logo: elevenlabsLogo },
  { name: 'Huanyuan', logo: hunyuanLogo },
  { name: 'Pika', logo: pikaLogo },
  { name: 'Kling', logo: klingLogo },
  { name: 'Recraft', logo: recraftLogo },
  { name: 'Bria', logo: briaLogo },
  { name: 'Seadance', logo: seedanceLogo }
];

// Sample story data - simplified to only show creator info
export const SAMPLE_STORIES: Story[] = [
  {
    id: 1,
    creator: "40rge",
    video: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737831905/zkqyrtqv2zphvzifp24z.mp4",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1741875825/ssjp8m9sazb1yjakxlbb.jpg"
  },
  {
    id: 2,
    creator: "Alex", 
    video: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1737488526/huodxykcghmpzgqacerw.mp4",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1737428271/ojwa4kj6xouavjukzmxc.jpg"
  },
  {
    id: 3,
    creator: "0xJackie",
    video: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1738557031/h2mdrergcjumm7qjkyiz.mp4",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1736999301/orihyxp0a4pcv7vfebqh.jpg"
  },
  {
    id: 4,
    creator: "Gojo23",
    video: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1742135429/ppvkmpobai93co8cyugu.mov",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1736306764/hcwtafjv4j0d6kxdeb74.jpg"
  },
  {
    id: 5,
    creator: "Erin",
    video: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1736469590/mwpv4qbtqa2jkxjfyojl.mp4",
    profileImage: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1742364172/raliq39cmkifyf7yrvsy.png"
  }
];

// Video URLs for features section
export const FEATURE_VIDEOS: FeatureVideos = {
  COLLABORATION: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1752867073/videoSpeed_l888sm.mp4",
  MONETIZATION: "https://res.cloudinary.com/dz2kyqfj9/video/upload/v1752959423/support44_syijhg.mp4"
};

// Image URLs for manifesto section
export const MANIFESTO_IMAGES: ManifestoImages = {
  MAIN: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1752931789/Screenshot_2025-07-19_at_9.29.44_AM_gnrxxq.png",
  OVERLAY: "https://res.cloudinary.com/dz2kyqfj9/image/upload/v1752932335/Screenshot_2025-07-19_at_9.38.46_AM_qdz6ia.png"
};
import { create } from 'zustand';
import { BookmarkService } from '../services/bookmarkService';
import type { Comic } from '../types';

const bookmarkService = new BookmarkService();

interface BookmarkStore {
  bookmarkedComics: Comic[];
  addBookmark: (comicId: string, walletAddress: string) => Promise<void>;
  removeBookmark: (comicId: string) => Promise<void>;
  isComicBookmarked: (comicId: string) => Promise<boolean>;
  loadBookmarkedComics: () => Promise<void>;
}

export const useBookmarkStore = create<BookmarkStore>((set) => ({
  bookmarkedComics: [],
  
  addBookmark: async (comicId: string, walletAddress: string) => {
    await bookmarkService.addBookmark(comicId, walletAddress);
    // Refresh the list after adding
    const comics = await bookmarkService.getBookmarkedComics();
    set({ bookmarkedComics: comics as Comic[] });
  },

  removeBookmark: async (comicId: string) => {
    await bookmarkService.removeBookmark(comicId);
    // Refresh the list after removing
    const comics = await bookmarkService.getBookmarkedComics();
    set({ bookmarkedComics: comics as Comic[] });
  },

  isComicBookmarked: async (comicId: string) => {
    return await bookmarkService.isComicBookmarked(comicId);
  },

  loadBookmarkedComics: async () => {
    const comics = await bookmarkService.getBookmarkedComics();
    set({ bookmarkedComics: comics as Comic[] });
  }
})); 
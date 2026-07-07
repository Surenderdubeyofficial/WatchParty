import { createSlice } from '@reduxjs/toolkit';

const initialTheme = localStorage.getItem('watch-party-theme') || 'dark';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: initialTheme,
    sidebarOpen: false
  },
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
      localStorage.setItem('watch-party-theme', action.payload);
    },
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    }
  }
});

export const { setTheme, toggleSidebar } = uiSlice.actions;
export default uiSlice.reducer;

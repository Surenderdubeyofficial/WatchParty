import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    status: 'guest'
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload;
      state.status = action.payload ? 'authenticated' : 'guest';
    },
    logout(state) {
      state.user = null;
      state.status = 'guest';
    }
  }
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;

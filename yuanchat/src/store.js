import { createStore } from 'vuex';
import createPersistedState from 'vuex-persistedstate';

const store = createStore({
  state: {
    nim: null
  },
  mutations: {
    setNim(state, nim) {
      state.nim = nim;
    }
  },
  plugins: [
    createPersistedState({
      reducer: (state) => {
        // 过滤掉包含循环引用的属性
        const { nim, ...filteredState } = state;
        return filteredState;
      }
    })
  ]
});

export default store;
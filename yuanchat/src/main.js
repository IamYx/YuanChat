import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { createStore } from 'vuex';
import createPersistedState from 'vuex-persistedstate';
// 删除下面这行未使用的导入
// import NIM from 'nim-web-sdk-ng';

// 创建一个简单的 store 示例
const store = createStore({
    state() {
        return {
            nim: null,
            nimConfig: null // 存储 nim 初始化所需的配置信息
        };
    },
    mutations: {
        setNim(state, nim) {
            state.nim = nim;
        },
        setNimConfig(state, config) {
            state.nimConfig = config;
        }
    },
    plugins: [
        createPersistedState({
            reducer: (state) => {
                const filteredState = {};
                for (const key in state) {
                    if (key === 'nim') {
                        // 不直接存储 nim 实例，而是存储配置信息
                        filteredState.nimConfig = state.nimConfig;
                    } else {
                        filteredState[key] = state[key];
                    }
                }
                return filteredState;
            }
        })
    ]
});

const app = createApp(App);
app.use(router);
app.use(store);
app.mount('#app');

import { createRouter, createWebHistory } from 'vue-router';
import HelloWorld from '../components/HelloWorld.vue';
import ConversationList from '../components/ConversationList.vue'; // 假设会话列表组件

const routes = [
  {
    path: '/',
    name: 'Login',
    component: HelloWorld
  },
  {
    path: '/conversation-list',
    name: 'ConversationList',
    component: ConversationList
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
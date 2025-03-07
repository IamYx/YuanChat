<template>
  <!-- 添加外层容器包裹两个区域 -->
  <div class="main-container">
    <div class="conversation-list-container">
      <h1>最近会话</h1>
      <ul>
        <!-- 渲染会话列表 -->
        <li v-for="conversation in conversationList" :key="conversation.id" 
            @click="selectedConversation = conversation; loadMessages(conversation)">
          <!-- 显示头像 -->
          <img :src="getAvatar(conversation)" alt="Avatar" class="avatar">
          {{ conversation.name }}
        </li>
      </ul>
    </div>
  
    <div class="message-detail-container">
      <div v-if="selectedConversation" class="message-area">
        <!-- 新增会话标题 -->
        <div class="conversation-header">
          <template v-if="selectedConversation.type === 1"> 
            与 {{ selectedConversation.name }} 的对话
          </template>
          <template v-else-if="selectedConversation.type === 2"> 
            群聊：{{ selectedConversation.name }}
          </template>
        </div>
        
        <!-- 消息历史 -->
        <div class="message-history" ref="messageHistory">
          <div v-for="(message, index) in currentMessages" :key="index" 
               class="message-bubble" :class="{ 'my-message': message.isOutgoing }">
            <!-- 发送者信息 -->
            <div class="sender-info">
              <img :src="getUserAvatar(message.senderId)" class="message-avatar">
              <span class="sender-name">{{ getUserName(message.senderId) }}</span>
            </div>
            <div class="message-content">{{ message.content }}</div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>
        
        <!-- 消息发送框 -->
        <div class="message-input-area">
          <input v-model="newMessage" @keyup.enter="sendMessage" 
                 placeholder="输入消息...">
          <button @click="sendMessage">发送</button>
        </div>
      </div>
      
      <div v-else class="empty-state">
        请选择会话开始聊天
      </div>
    </div>
  </div>
</template>

<script>
import { useStore } from 'vuex';
import NIM from 'nim-web-sdk-ng';
import dayjs from 'dayjs'

export default {
  name: 'ConversationList',
  data() {
    return {
      conversationList: [], // 存储会话列表数据
      syncFinish: false,
      nim: null,
      selectedConversation: null,
      currentMessages: [],
      newMessage: '',
      // 新增用户信息缓存
      userInfoCache: new Map(),
    };
  },
  mounted() {
    const store = useStore();
    this.nim = store.state.nim;

    if (!this.nim) {
      const nimConfig = this.$store.state.nimConfig;
      console.log(`=== NIM 初始化配置 ${nimConfig}`);
      this.nim = NIM.getInstance({
        appkey: nimConfig[0],
        debugLevel: "debug",
        apiVersion: "v2"
      });
      if (this.nim) {
        this.$store.commit('setNim', this.nim);
        console.log('=== NIM 已初始化');
        if (this.nim.V2NIMLoginService) {
          this.nim.V2NIMLoginService.login(nimConfig[1], nimConfig[2], {
            "forceMode": false
          }).then(() => {
            console.log('=== 登录成功');
          }).catch((err) => {
            console.error('=== 登录失败:', err);
          });
        }

      }
    } else {
      console.log('=== NIM 不需要初始化');
    }
    this.nim.V2NIMConversationService.on("onSyncFinished", () => {
      console.log('=== NIM 同步完成');
      this.syncFinish = true;
      this.getConversationList();
    });
  },
  methods: {
    async getConversationList() {
      console.log('=== NIM 获取会话列表');
      try {
        const result = await this.nim.V2NIMConversationService.getConversationList(0, 100);
        if (result) {
          this.conversationList = result.conversationList;
          for (let index = 0; index < result.conversationList.length; index++) {
            const element = result.conversationList[index];
            console.log(`=== ${element.name}`);
          }
        }
      } catch (err) {
        console.error(`=== 获取最近会话列表失败: ${err} ==`);
      }
    },

    getAvatar(conversation) {
      if (conversation.avatar) {
        return conversation.avatar;
      }
      const initials = conversation.name.slice(0, 2).toUpperCase();
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ccc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '20px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
      return canvas.toDataURL();
    },

    // 新增用户信息获取方法
    async fetchUserInfo(userId) {
      if (!this.userInfoCache.has(userId)) {
        try {
          console.log('=== 获取用户信息:', userId);
          const users = await this.nim.V2NIMUserService.getUserList([userId]);
          this.userInfoCache.set(userId, users[0]);
        } catch (err) {
          console.error('=== 获取用户信息失败:', err);
          this.userInfoCache.set(userId, { 
            name: `用户${userId.slice(-4)}`,
            avatar: this.generateDefaultAvatar(userId)
          });
        }
      }
      return this.userInfoCache.get(userId);
    },
    
    // 生成默认头像
    generateDefaultAvatar(userId) {
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ccc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '16px Arial';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(userId.slice(-2), canvas.width/2, canvas.height/2);
      return canvas.toDataURL();
    },
    
    // 获取用户头像
    getUserAvatar(userId) {
      return this.userInfoCache.get(userId)?.avatar || this.generateDefaultAvatar(userId);
    },
    
    // 获取用户名
    getUserName(userId) {
      return this.userInfoCache.get(userId)?.name || `用户${userId.slice(-4)}`;
    },
    
    async loadMessages(conversation) {
      try {
        const result = await this.nim.V2NIMMessageService.getMessageList({
          conversationId: conversation.conversationId,
          limit: 50,
        });
        
        // 批量获取用户信息
        const uniqueUserIds = [...new Set(result.map(msg => msg.senderId))];
        console.log(`=== 批量获取用户信息：${uniqueUserIds}`)
        await Promise.all(uniqueUserIds.map(userId => this.fetchUserInfo(userId)));
        
        this.currentMessages = result.map(msg => ({
          content: msg.text,
          timestamp: msg.createTime,
          isOutgoing: msg.isSelf,
          senderId: msg.senderId
        })).reverse();

        // 新增加载后滚动
        this.$nextTick(() => {
          const container = this.$refs.messageHistory;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      } catch (err) {
        console.error('=== 加载消息失败:', err.detail);
      }
    },
    
    async sendMessage() {
      if (!this.newMessage.trim()) return;
      
      const message = this.nim.V2NIMMessageCreator.createTextMessage(this.newMessage);
      try {
        await this.nim.V2NIMMessageService.sendMessage(message, this.selectedConversation.conversationId);

          // 本地临时显示
        console.log('=== 发送消息失败:', this.nim.V2NIMLoginService.userId);
        this.currentMessages.push({
              content: message.text,
              timestamp: message.createTime,
              isOutgoing: true,
              senderId: this.nim.V2NIMLoginService.getLoginUser()
        });
        this.newMessage = '';

       // 新增滚动到底部逻辑
        this.$nextTick(() => {
          const container = this.$refs.messageHistory;
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
        
      } catch(err) {
        console.error('=== 发送消息失败:', err.detail);
      }
    },
    
    formatTime(timestamp) {
      return dayjs(timestamp).format('HH:mm');
    }
  }
}
</script>

<style scoped>
/* 新增外层容器样式 */
.main-container {
  display: flex;
  height: 90vh; /* 恢复全屏高度 */
}

/* 会话列表容器 */
.conversation-list-container {
  width: 33.33%;
  overflow-y: auto; /* 仅会话列表滚动 */
  height: 100%;     /* 继承外层高度 */
}

/* 消息详情容器 */
.message-detail-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%; /* 继承外层高度 */
}

/* 消息区域 */
.message-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止内容溢出 */
}

/* 消息历史 */
.message-history {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;          /* 新增 */
  flex-direction: column; /* 新增 */
}

/* 消息气泡新增样式 */
.message-bubble {
  max-width: 70%;
  min-width: 60px;
  margin: 8px 0;
  padding: 12px 16px;
  border-radius: 18px;
  background: #f0f0f0;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-bubble.my-message {
  background: #0084ff;
  color: white;
  margin-left: auto;
  margin-right: 0;
}

/* 发送者信息样式 */
.sender-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.message-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.sender-name {
  font-size: 12px;
  color: #666;
}

/* 新增右侧消息发送者样式 */
.message-bubble.my-message .sender-name {
  color: rgba(255, 255, 255, 0.9); /* 使用半透明白色 */
}

/* 调整右侧消息文字颜色 */
.message-bubble.my-message .message-content {
  color: white;
}

.message-bubble.my-message .message-time {
  color: rgba(255, 255, 255, 0.8);
}

/* 修复输入框嵌套样式问题（Vue scoped样式不支持嵌套写法） */
.message-input-area {
  padding: 0 20px 20px; /* 添加左右间距 */
  display: flex;
  gap: 10px;
}

.message-input-area input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  padding-right: 80px; /* 为按钮预留空间 */
}

.message-input-area button {
  position: absolute;
  right: 30px; /* 与容器右间距对齐 */
  bottom: 30px; /* 与容器底部间距对齐 */
  padding: 10px 20px;
  background: #0084ff;
  color: white;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  transition: opacity 0.2s;
}

.message-input-area button:hover {
  opacity: 0.9;
}

.empty-state {
  display: flex;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: #999;
}

/* 头像样式 */
.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  margin-right: 10px;
  vertical-align: middle;
  object-fit: cover; /* 新增图片裁剪方式 */
  flex-shrink: 0;    /* 防止头像被压缩 */
}

/* 列表项样式 */
li {
  padding: 10px 15px; /* 调整内边距 */
  display: flex;      /* 启用flex布局 */
  align-items: center;/* 垂直居中 */
  gap: 10px;         /* 元素间距 */
  border-bottom: 1px solid #e0e0e0;
  color: #333;
  background-color: #f9f9f9;
  transition: background-color 0.3s ease;
}

/* 文字容器添加弹性布局 */
li > span {
  flex: 1;
  text-align: left;  /* 保证文字居左 */
}

.message-content {
  word-break: break-word;
}

.message-time {
  font-size: 12px;
  margin-top: 4px;
  text-align: right; /* 时间始终右对齐 */
}

/* 新增会话标题样式 */
.conversation-header {
padding: 16px 20px;
font-size: 18px;
font-weight: 500;
border-bottom: 1px solid #e0e0e0;
background: #f8f9fa;
}

/* 调整消息历史容器高度 */
.message-history {
height: calc(100% - 120px); /* 为标题和输入框预留空间 */
}
</style>
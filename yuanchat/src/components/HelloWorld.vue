<template>
  <div class="login-container">
    <h1>登录页面</h1>
    <form @submit.prevent="handleLogin">
      <input type="text" v-model="username" placeholder="用户名" required />
      <input type="password" v-model="password" placeholder="密码" required />
      <button type="submit">登录</button>
    </form>
  </div>
</template>

<script>
import V2NIM from 'nim-web-sdk-ng';
import router from '@/router';

const APPKEY = '4727023efa991d31d61b3b32e819bd5b';

export default {
  data() {
    return {
      username: '',
      password: '',
      nim: null
    };
  },
  mounted() {
    const params1 = {
          "appkey": APPKEY,
          "debugLevel": "debug",
          "apiVersion": "v2",
          "enableV2CloudConversation": true,
      }
      const params2 = {
          "V2NIMLoginServiceConfig": {
              "lbsUrls": ["https://lbs.netease.im/lbs/webconf.jsp"
              ],
              "linkUrl": "weblink.netease.im:443"
          },
      }

      this.nim = V2NIM.getInstance(params1, params2);

      console.log('=== 初始化成功');
  },
  methods: {
    async handleLogin() {
      // this.nim = NIM.getInstance({
      //   appkey: APPKEY,
      //   debugLevel: "debug",
      //   apiVersion: "v2",
      //   lbsUrls: ['https://yunxin.yto56test.com:7443/lbs/webconf.jsp'],
      //   linkUrl: 'yunxin.yto56test.com:7443',
      // });

      this.$store.commit('setNim', this.nim); 

      await this.nim.V2NIMLoginService.login(this.username, this.password, {
        "forceMode": false
      }).then(() => {
        console.log('=== 登录成功');
        this.$store.commit('setNimConfig', [APPKEY, this.username, this.password]);
        router.push({ name: 'ConversationList' })
              .then(() => {
                  console.log('=== 成功跳转到了 ConversationList 页面');
              })
              .catch((error) => {
                  console.error('=== 路由跳转失败:', error);
              });
      }).catch((err) => {
        console.error('=== 登录失败:', err);
      });

      const theListnerFn = (status) => {
        switch (status) {
          case 0:
            console.log('=== 登出成功');
            break;
          case 1:
            console.log('=== 登录成功');
            // Login successful, navigate to the conversation list page
            break;
          case 2:
            console.log('=== 登录中');
            break;
          case 3:
            console.log('=== 登录失败');
            break;
          default:
            console.log('=== 未知的登录状态:', status);
        }
      };

      this.nim.V2NIMLoginService.on("onLoginStatus", theListnerFn);
    }
  }
};
</script>

<style scoped>
.login-container {
  max-width: 300px;
  margin: 0 auto;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
  background-color: #f9f9f9;
}

.login-container h1 {
  text-align: center;
  margin-bottom: 20px;
  /* 修改字体样式 */
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  font-size: 28px;
  color: #333;
  font-weight: 600;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.login-container input {
  width: calc(100% - 22px);
  padding: 10px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 3px;
  box-sizing: border-box;
}

.login-container button {
  width: 100%;
  padding: 10px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 3px;
  cursor: pointer;
}

.login-container button:hover {
  background-color: #0056b3;
}
</style>
# 动物大战外星人

《动物大战外星人》是一款融合魔兽经典职业与世界观反派阵营（燃烧军团、天灾亡灵、邪血兽人、黑铁矮人、风险投资公司地精、艾瑞达虚空德莱尼）的微信割草肉鸽生存小游戏。

## 源码目录介绍

```
├── audio                                      // 音频资源
├── images                                     // 图片资源
├── js
│   ├── base
│   │   ├── animatoin.js                       // 帧动画的简易实现
│   │   ├── pool.js                            // 对象池的简易实现
│   │   └── sprite.js                          // 游戏基本元素精灵类
│   ├── libs
│   │   └── tinyemitter.js                     // 事件监听和触发
│   ├── npc
│   │   └── enemy.js                           // 敌机类
│   ├── player
│   │   ├── bullet.js                          // 子弹类
│   │   └── index.js                           // 玩家类
│   ├── runtime
│   │   ├── background.js                      // 背景类
│   │   ├── gameinfo.js                        // 用于展示分数和结算界面
│   │   └── music.js                           // 全局音效管理器
│   ├── databus.js                             // 管控游戏状态
│   ├── main.js                                // 游戏入口主函数
│   └── render.js                              // 基础渲染信息
├── .eslintrc.js                               // 代码规范
├── game.js                                    // 游戏逻辑主入口
├── game.json                                  // 游戏运行时配置
├── project.config.json                        // 项目配置
└── project.private.config.json                // 项目个人配置
```

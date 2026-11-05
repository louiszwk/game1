// 云函数 unlockAchievement：服务端审计记录成就解锁流水
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
});

const db = cloud.database();

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { achievementId, name, reward } = event;

  if (!achievementId) {
    return { success: false, reason: 'missing_achievementId' };
  }

  try {
    // 写入成就流水日志（幂等去重审计）
    await db.collection('achievement_logs').add({
      data: {
        _openid: openid,
        achievementId,
        name: name || '',
        reward: reward || null,
        unlockedAt: db.serverDate(),
      },
    });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};


/**
 * 玩家动物英雄类 (Animal Hero)
 * 支持：鸡、鸭、牛、羊、鱼 5大常见动物
 * 包含专属形象绘制、动作动画、种族特性与技能联动
 */

import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { RACES, CLASSES, SKILLS } from '../skills/skill_data';

export default class Player {
  constructor() {
    this.width = 46;
    this.height = 46;
    this.x = SCREEN_WIDTH / 2;
    this.y = SCREEN_HEIGHT / 2;

    this.raceId = 'chicken';
    this.classId = 'holy_knight';

    this.raceData = RACES.chicken;
    this.classData = CLASSES.holy_knight;

    this.level = 1;
    this.exp = 0;
    this.maxExp = 10;

    this.hp = 100;
    this.maxHp = 100;
    this.baseSpeed = 5.5;
    this.speed = 5.5;

    this.atkMultiplier = 1.0;
    this.cooldownReduce = 0;
    this.critRate = 0.05;
    this.dodgeRate = 0;
    this.lifeSteal = 0;
    this.magnetRadius = 95;
    this.hpRegen = 0;

    // 种族专属状态
    this.fleeTimer = 0; // 鸡受惊狂奔计时器
    this.woolShield = false; // 羊毛护盾是否存在
    this.woolShieldCooldown = 0; // 羊毛护盾充能计时器

    this.facing = 1; // 1: right, -1: left
    this.invulnerableTime = 0; // 受伤无敌无敌帧
    this.bobbing = 0; // 呼吸/走动摇摆
    this.wingFlap = 0; // 翅膀/鳍拍打
    this.isMoving = false;
    this.regenTimer = 0;
  }

  setup(raceId, classId) {
    this.raceId = raceId;
    this.classId = classId;
    this.raceData = RACES[raceId] || RACES.chicken;
    this.classData = CLASSES[classId] || CLASSES.holy_knight;

    this.level = 1;
    this.exp = 0;
    this.maxExp = 5; // 前期极快升级，击杀 4-5 只怪即可触发首次三选一

    this.maxHp = (this.classData.baseHp || 100) + 50;
    this.baseSpeed = Math.round((this.classData.baseSpeed || 4.0) * 1.35 * 10) / 10; // 提速至 5.4+ 畅快跟手
    this.speed = this.baseSpeed;
    this.cooldownReduce = this.classData.cooldownReduce || 0;
    this.atkMultiplier = 1.0;
    this.critRate = 0.05;
    this.dodgeRate = 0;
    this.lifeSteal = 0;
    this.magnetRadius = 95;
    this.hpRegen = 1; // 自带基础回血

    // 叠加动物种族特性
    const mod = this.raceData.modifiers || {};
    if (mod.maxHpBonus) this.maxHp += mod.maxHpBonus;
    if (mod.speedBonus) this.baseSpeed *= (1 + mod.speedBonus);
    if (mod.critRate) this.critRate += mod.critRate;
    if (mod.dodgeRate) this.dodgeRate += mod.dodgeRate;
    if (mod.magnetBonus) this.magnetRadius *= (1 + mod.magnetBonus);
    if (mod.woolShield) {
      this.woolShield = true;
      this.woolShieldCooldown = 0;
    }

    this.hp = this.maxHp;
    this.speed = this.baseSpeed;

    this.x = SCREEN_WIDTH / 2;
    this.y = SCREEN_HEIGHT / 2 + 50;
    this.invulnerableTime = 0;
    this.fleeTimer = 0;
  }

  /**
   * 检验该技能是否符合本职业修习规矩与种族专属限制 (派系禁忌与专属判定)
   */
  canLearnSkill(skillId) {
    const skill = SKILLS[skillId];
    if (!skill) return false;

    // 1. 种族技能限制：仅本种族方可修习自身的本命特技
    if (skill.category === 'RACIAL') {
      return this.raceData.racialSkillId === skillId;
    }

    // 2. 职业修习禁忌：被当前职业列为禁忌派系的技能坚决无法修习
    if (this.classData && this.classData.forbiddenCategories) {
      if (this.classData.forbiddenCategories.includes(skill.category)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取某技能在此玩家身上的最大可学等级 (血脉联动：突破上限至 Lv.6 神话极境)
   */
  getMaxSkillLevel(skillId) {
    const skill = SKILLS[skillId];
    if (!skill) return 5;

    // 若属于该种族的天命共鸣技能，突破上限至 Lv.6！
    if (this.raceData && this.raceData.affinitySkills && this.raceData.affinitySkills.includes(skillId)) {
      return 6;
    }

    return skill.maxLevel || 5;
  }

  /**
   * 判定该技能是否属于当前种族的天命突破技能
   */
  isAffinitySkill(skillId) {
    return Boolean(this.raceData && this.raceData.affinitySkills && this.raceData.affinitySkills.includes(skillId));
  }

  move(dirX, dirY, intensity) {
    if (intensity > 0.02) {
      this.isMoving = true;

      // 鸡受惊加速
      let currentSpeed = this.speed;
      if (this.fleeTimer > 0) {
        currentSpeed *= 1.5;
      }

      const actualSpeed = currentSpeed * intensity;
      this.x += dirX * actualSpeed;
      this.y += dirY * actualSpeed;

      if (dirX > 0.1) this.facing = 1;
      else if (dirX < -0.1) this.facing = -1;

      this.bobbing += 0.3;
      this.wingFlap += 0.4;

      // 限制在屏幕内
      const pad = 24;
      this.x = Math.max(pad, Math.min(SCREEN_WIDTH - pad, this.x));
      this.y = Math.max(pad, Math.min(SCREEN_HEIGHT - pad, this.y));
    } else {
      this.isMoving = false;
      this.bobbing += 0.06;
      this.wingFlap += 0.08;
    }
  }

  takeDamage(amount) {
    if (this.invulnerableTime > 0) return { taken: false, dodge: false };

    // 闪避判定（鸭自带高闪避）
    if (Math.random() < this.dodgeRate) {
      return { taken: false, dodge: true };
    }

    // 羊毛护盾格挡判定（羊天生具备）
    if (this.woolShield) {
      this.woolShield = false;
      this.woolShieldCooldown = 600; // 10秒后重新生成
      this.invulnerableTime = 25;
      return { taken: false, shieldBlock: true };
    }

    // 牛受伤害减免
    let finalDamage = amount;
    if (this.raceData.modifiers && this.raceData.modifiers.damageReduce) {
      finalDamage = Math.round(finalDamage * (1 - this.raceData.modifiers.damageReduce));
    }

    this.hp = Math.max(0, this.hp - finalDamage);
    this.invulnerableTime = 30; // 0.5秒无敌帧保护

    // 狂暴母鸡受惊加速
    if (this.raceId === 'chicken') {
      this.fleeTimer = 90; // 1.5秒狂奔
    }

    // 受击震动节流：至少间隔 1.5 秒且使用 light 微震，杜绝蜂鸣般的高频狂震
    const now = Date.now();
    if (!this.lastHitVibrateTime || now - this.lastHitVibrateTime > 1500) {
      this.lastHitVibrateTime = now;
      try {
        wx.vibrateShort({ type: 'light' });
      } catch (e) {}
    }

    return { taken: true, damage: finalDamage };
  }

  heal(amount) {
    if (this.hp <= 0) return 0;
    const oldHp = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + amount);
    return Math.round(this.hp - oldHp);
  }

  gainExp(amount) {
    this.exp += amount;

    let leveledUp = false;
    while (this.exp >= this.maxExp) {
      this.exp -= this.maxExp;
      this.level++;
      this.maxExp = Math.floor(5 * Math.pow(1.22, this.level - 1) + this.level * 3);
      leveledUp = true;
      this.heal(Math.round(this.maxHp * 0.35));
    }

    return leveledUp;
  }

  update() {
    if (this.invulnerableTime > 0) {
      this.invulnerableTime--;
    }

    if (this.fleeTimer > 0) {
      this.fleeTimer--;
    }

    // 绵羊护盾充能
    if (!this.woolShield && this.raceId === 'sheep') {
      this.woolShieldCooldown--;
      if (this.woolShieldCooldown <= 0) {
        this.woolShield = true;
      }
    }

    // 生命自然恢复
    if (this.hpRegen > 0) {
      this.regenTimer++;
      if (this.regenTimer >= 60) {
        this.regenTimer = 0;
        this.heal(this.hpRegen);
      }
    }
  }

    // ===================== 绘制动物主角 (严格分层，保证主角外形与萌系特色永远清晰突出) =====================
  render(ctx) {
    ctx.save();

    // 受伤无敌闪烁
    if (this.invulnerableTime > 0 && Math.floor(this.invulnerableTime / 4) % 2 === 1) {
      ctx.globalAlpha = 0.55;
    }

    const bobOffset = Math.sin(this.bobbing) * 2.5;
    const drawY = this.y + bobOffset;

    // ------------ LAYER 1: 地面阴影与脚底光环 (贴合地面，绝不遮挡角色身躯) ------------
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 18, 18, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // 等级 >= 2：脚底旋转元素魔法阵 (严格为地面透视扁平椭圆，半透明衬托)
    if (this.level >= 2) {
      ctx.save();
      const runeAngle = this.bobbing * 0.8;
      ctx.translate(this.x, this.y + 19);
      ctx.rotate(runeAngle);
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = this.classData.color || '#f1c40f';
      ctx.lineWidth = this.level >= 4 ? 2 : 1.3;

      const rX = 22 + Math.min(6, this.level);
      const rY = rX * 0.42; // 透视扁平，自然伏贴在地面
      ctx.beginPath();
      ctx.ellipse(0, 0, rX, rY, 0, 0, Math.PI * 2);
      ctx.stroke();

      if (this.level >= 3) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = (Math.PI / 2) * i;
          ctx.moveTo(Math.cos(a) * rX * 0.8, Math.sin(a) * rY * 0.8);
          ctx.lineTo(Math.cos(a + Math.PI) * rX * 0.8, Math.sin(a + Math.PI) * rY * 0.8);
        }
        ctx.stroke();
      }
      ctx.restore();
    }

    // ------------ LAYER 2: 背后羽翼与神话光辉 (位于角色背后，优雅衬托主角) ------------
    ctx.save();
    ctx.translate(this.x, drawY);
    ctx.scale(this.facing, 1);

    // 等级 >= 5：背后展开精致羽翼 (半透明柔光，向两侧延展，绝不遮盖动物主体)
    if (this.level >= 5) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5;
      const wingSpread = Math.sin(this.bobbing * 1.5) * 4;
      const wingColor = this.classData.color || '#f1c40f';
      ctx.strokeStyle = wingColor;
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(255, 245, 200, 0.35)';

      // 左背翼 (多段精致羽片轮廓)
      ctx.beginPath();
      ctx.moveTo(-10, -4);
      ctx.quadraticCurveTo(-35 - wingSpread, -32, -48 - wingSpread, -18);
      ctx.quadraticCurveTo(-40, -4, -30, 2);
      ctx.quadraticCurveTo(-20, 8, -10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 右背翼
      ctx.beginPath();
      ctx.moveTo(10, -4);
      ctx.quadraticCurveTo(35 + wingSpread, -32, 48 + wingSpread, -18);
      ctx.quadraticCurveTo(40, -4, 30, 2);
      ctx.quadraticCurveTo(20, 8, 10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // ------------ LAYER 3: 动物英雄本体 (中心清晰主视觉，高清卡通勾边，个性鲜明) ------------
    // 咸鱼残血狂暴高亮 (轻量高对比脉冲血怒环，零 shadowBlur 发热开销)
    if (this.raceId === 'fish' && this.hp < this.maxHp * 0.5) {
      const ragePulse = 18 + Math.sin(this.bobbing * 2) * 3;
      ctx.strokeStyle = 'rgba(231, 76, 60, 0.75)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, ragePulse, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 绘制各自专属且极具特色的动物形象
    switch (this.raceId) {
      case 'chicken':
        this.drawChicken(ctx);
        break;
      case 'duck':
        this.drawDuck(ctx);
        break;
      case 'cow':
        this.drawCow(ctx);
        break;
      case 'sheep':
        this.drawSheep(ctx);
        break;
      case 'fish':
        this.drawFish(ctx);
        break;
      default:
        this.drawChicken(ctx);
        break;
    }

    // ------------ LAYER 4: 头部轻盈显圣饰物 (精准悬浮在头顶上方，绝不遮挡眼睛面容) ------------
    if (this.level >= 4) {
      ctx.save();
      const school = this.classData.schoolAffinity || 'holy';
      // 动态避让高角/高冠动物
      const headOffsetY = (this.raceId === 'cow' || this.raceId === 'chicken') ? -36 : -30;

      if (school === 'holy') {
        // 圣金神圣光环（高悬头顶上方，轻盈空灵）
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(0, headOffsetY, 13, 4, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (school === 'fel') {
        // 邪能小恶魔角（向后斜翘，避免与牛角冲突）
        if (this.raceId !== 'cow') {
          ctx.fillStyle = '#2ecc71';
          ctx.strokeStyle = '#10ac84';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-6, headOffsetY + 6);
          ctx.lineTo(-12, headOffsetY - 5);
          ctx.lineTo(-2, headOffsetY + 4);
          ctx.moveTo(6, headOffsetY + 6);
          ctx.lineTo(12, headOffsetY - 5);
          ctx.lineTo(2, headOffsetY + 4);
          ctx.fill();
          ctx.stroke();
        } else {
          // 牛自带大角，额外在牛角尖赋予邪能翠绿火苗
          ctx.fillStyle = '#2ecc71';
          ctx.beginPath();
          ctx.arc(-14, -30, 3, 0, Math.PI * 2);
          ctx.arc(14, -30, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (school === 'shadow') {
        // 虚空环绕宝珠（宽轨环绕头顶）
        const orbAng = this.bobbing * 2;
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath();
        ctx.arc(Math.cos(orbAng) * 20, headOffsetY + Math.sin(orbAng) * 3, 3, 0, Math.PI * 2);
        ctx.arc(Math.cos(orbAng + Math.PI) * 20, headOffsetY + Math.sin(orbAng + Math.PI) * 3, 3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 黄金战神王冠
        ctx.fillStyle = '#f1c40f';
        ctx.strokeStyle = '#d35400';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-8, headOffsetY + 6);
        ctx.lineTo(-10, headOffsetY);
        ctx.lineTo(-4, headOffsetY + 4);
        ctx.lineTo(0, headOffsetY - 2);
        ctx.lineTo(4, headOffsetY + 4);
        ctx.lineTo(10, headOffsetY);
        ctx.lineTo(8, headOffsetY + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    // 羊毛防护罩光圈 (轻柔脉冲外光圈)
    if (this.woolShield) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 受惊狂奔尾气
    if (this.fleeTimer > 0) {
      ctx.fillStyle = '#f39c12';
      ctx.beginPath();
      ctx.arc(-18, 10, 4, 0, Math.PI * 2);
      ctx.arc(-24, 12, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();

    // 角色头顶血条 (适度拉高，避免紧贴头顶)
    this.renderHealthBar(ctx);
  }


  // 1. 🐔 狂暴机动灵鸡 (火影查克拉羽刃、高光白黄身、红宝石鸡冠、星芒眼神)
  drawChicken(ctx) {
    const flap = Math.sin(this.wingFlap) * 4;

    // 鸡爪 (带高光金属脚环)
    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, 13); ctx.lineTo(-4, 19);
    ctx.moveTo(4, 13);  ctx.lineTo(4, 19);
    ctx.stroke();

    // 身体 (硬朗的高光阴影，漫画质感)
    const bodyGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 16);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.7, '#fff200');
    bodyGrad.addColorStop(1, '#ff9f43');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 火影风查克拉外展羽刃翅膀
    ctx.fillStyle = '#feca57';
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-17, -7 + flap);
    ctx.lineTo(-13, 7 + flap);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 宝石红晶莹三联鸡冠
    ctx.fillStyle = '#ff4757';
    ctx.strokeStyle = '#b71540';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -18, 5, 0, Math.PI * 2);
    ctx.arc(6, -19, 4.5, 0, Math.PI * 2);
    ctx.arc(-5, -17, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 尖黄喙与下肉垂
    ctx.fillStyle = '#ff9f43';
    ctx.strokeStyle = '#ee5253';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(14, -6);
    ctx.lineTo(25, -2);
    ctx.lineTo(14, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.ellipse(13, 5, 3.5, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 漫画风双层高光星芒大眼
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, -4, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(9, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, -5, 1.2, 0, Math.PI * 2);
    ctx.arc(8, -3, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. 🦆 嘎嘎神鸭 (配戴标志性战术科技墨镜/护目镜、雪白圆润机能身、大扁橙嘴)
  drawDuck(ctx) {
    const flap = Math.sin(this.wingFlap) * 3;

    ctx.strokeStyle = '#e67e22';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-4, 14); ctx.lineTo(-4, 19);
    ctx.moveTo(4, 14);  ctx.lineTo(4, 19);
    ctx.stroke();

    // 身体 (雪白微光渐变)
    const bodyGrad = ctx.createRadialGradient(-3, 0, 2, 0, 2, 16);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.8, '#f5f6fa');
    bodyGrad.addColorStop(1, '#c8d6e5');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 2, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 翅膀
    ctx.fillStyle = '#dfe4ea';
    ctx.strokeStyle = '#747d8c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-7, 4 + flap, 10, 7, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 翡翠绿头颈
    const headGrad = ctx.createRadialGradient(2, -8, 2, 4, -8, 12);
    headGrad.addColorStop(0, '#2ed573');
    headGrad.addColorStop(1, '#10ac84');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#1e272e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(5, -8, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 大扁橙嘴
    ctx.fillStyle = '#ff9f43';
    ctx.strokeStyle = '#d35400';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(17, -6, 8, 4, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // ⭐ 标志性战术科技墨镜/护目镜
    ctx.fillStyle = '#00d2d3';
    ctx.strokeStyle = '#222f3e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(9, -8, 5.5, 3.8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7, -10); ctx.lineTo(10, -6);
    ctx.stroke();
  }

  // 3. 🐂 须佐重铠蛮牛 (奶牛黑白水墨战纹、须佐级合金巨角、金鼻环、霸气战意)
  drawCow(ctx) {
    // 粗壮四蹄
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(-8, 14, 5, 6);
    ctx.fillRect(3, 14, 5, 6);

    // 身体 (黑白水墨战纹渐变)
    const bodyGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.85, '#dfe4ea');
    bodyGrad.addColorStop(1, '#747d8c');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, 17, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 水墨战纹斑块
    ctx.fillStyle = '#2f3542';
    ctx.beginPath();
    ctx.arc(-8, -5, 6, 0, Math.PI * 2);
    ctx.arc(7, 5, 5, 0, Math.PI * 2);
    ctx.fill();

    // 须佐合金巨角 (霸气外扬)
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-7, -12); ctx.quadraticCurveTo(-20, -25, -12, -30);
    ctx.moveTo(7, -12);  ctx.quadraticCurveTo(20, -25, 12, -30);
    ctx.stroke();

    // 宽粉口鼻与金鼻环
    ctx.fillStyle = '#ffb8b8';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(6, 4, 8, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(8, 8, 3.5, 0, Math.PI * 2);
    ctx.stroke();

    // 死神风锐利坚毅血瞳
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.moveTo(2, -6); ctx.lineTo(8, -3); ctx.lineTo(2, 0);
    ctx.fill();
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(5, -3, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. 🐑 仙人祥云绵羊 (云朵多重蓬松羊毛、螺旋黄金羊角、软萌微笑眯眯眼)
  drawSheep(ctx) {
    const puffs = [
      [-10, -6, 8], [0, -10, 8.5], [10, -6, 8],
      [-11, 4, 8], [0, 8, 9], [11, 4, 8], [0, 0, 11]
    ];
    ctx.fillStyle = '#f8f9fa';
    ctx.strokeStyle = '#dcdde1';
    ctx.lineWidth = 2.2;
    puffs.forEach(([px, py, pr]) => {
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    // 螺旋黄金羊角
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.arc(-11, -12, 6, 0.4, Math.PI * 1.6);
    ctx.stroke();

    // 萌系粉脸与微笑眼
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.ellipse(7, 0, 7.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#2f3542';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(8, -1, 3, 0.2, Math.PI * 0.9);
    ctx.stroke();
  }

  // 5. 🐟 咸鱼剑仙 (幻彩锦鲤流线鳞片、飘逸大分叉尾鳍、口衔灵光飞剑)
  drawFish(ctx) {
    const wag = Math.sin(this.wingFlap * 1.5) * 4;

    // 飘逸分叉大尾鳍
    ctx.fillStyle = 'rgba(255, 118, 117, 0.85)';
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-12, 0);
    ctx.quadraticCurveTo(-22, -10 + wag, -24, -14 + wag);
    ctx.quadraticCurveTo(-18, 0, -24, 14 + wag);
    ctx.quadraticCurveTo(-22, 10 + wag, -12, 0);
    ctx.fill();
    ctx.stroke();

    // 锦鲤渐变流线鱼身
    const bodyGrad = ctx.createLinearGradient(-12, 0, 16, 0);
    bodyGrad.addColorStop(0, '#e74c3c');
    bodyGrad.addColorStop(0.5, '#ff7675');
    bodyGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(2, 0, 15, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 晶莹大鱼眼
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(10, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0984e3';
    ctx.beginPath();
    ctx.arc(11, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(12, -3, 1, 0, Math.PI * 2);
    ctx.fill();

    // 口中衔着一柄流光灵剑 (御剑飞仙)
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(14, 2); ctx.lineTo(25, 6);
    ctx.stroke();
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(15, 1, 3, 3);
  }

  /**
   * 判断玩家是否能够修习某项技能
   * 1. 种族特技仅限对应种族修习
   * 2. 检查职业修习禁忌 (forbiddenCategories)
   */
  canLearnSkill(skillId) {
    const skill = SKILLS[skillId];
    if (!skill) return false;

    // 专属种族技能仅允许所属种族修习
    if (skill.category === 'RACIAL') {
      return this.raceData && this.raceData.racialSkillId === skillId;
    }

    // 职业修习禁忌判定 (如圣骑士禁修邪能/死亡，邪能术士禁修神圣，战士禁修邪能/神圣)
    if (this.classData && Array.isArray(this.classData.forbiddenCategories)) {
      if (this.classData.forbiddenCategories.includes(skill.category)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取玩家针对某技能的最高可修习等级上限
   * 若为本种族天命共鸣突破技能 (affinitySkills)，上限突破至 Lv.6 神话极境！
   * 其余技能上限为 5
   */
  getMaxSkillLevel(skillId) {
    if (this.isAffinitySkill(skillId)) {
      return 6;
    }
    const skill = SKILLS[skillId];
    return (skill && skill.maxLevel) || 5;
  }

  /**
   * 判断是否为本种族天命共鸣突破技能
   */
  isAffinitySkill(skillId) {
    if (!this.raceData || !Array.isArray(this.raceData.affinitySkills)) {
      return false;
    }
    return this.raceData.affinitySkills.includes(skillId);
  }

  renderHealthBar(ctx) {
    const barWidth = 38;
    const barHeight = 5;
    const barX = this.x - barWidth / 2;
    const barY = this.y - 42; // 抬升高度，绝不遮盖动物头部饰品

    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(barX - 1, barY - 1, barWidth + 2, barHeight + 2);

    const hpRatio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    const grad = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    if (hpRatio > 0.4) {
      grad.addColorStop(0, '#2ecc71');
      grad.addColorStop(1, '#27ae60');
    } else {
      grad.addColorStop(0, '#e74c3c');
      grad.addColorStop(1, '#c0392b');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    ctx.restore();
  }
}

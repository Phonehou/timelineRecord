const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/* ================= 工具函数 ================= */

function getWeekNumber(date) {
  const d = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDayLabel(date) {
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return map[date.getDay()];
}

function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;

  const weekStart = new Date(d);
  weekStart.setDate(d.getDate() - day + 1);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd)
  };
}

function formatWeeks(days = [], events = []) {
  const weekMap = {};

  // 先把 events 按 dayId 分组
  const eventMap = {};
  events.forEach(e => {
    if (!eventMap[e.dayId]) eventMap[e.dayId] = [];
    eventMap[e.dayId].push(e);
  });

  days.forEach(day => {
    const dateObj = new Date(day.date);
    const year = dateObj.getFullYear();
    const week = getWeekNumber(dateObj);
    const weekKey = `${year}-W${week}`;
    const { weekStart, weekEnd } = getWeekRange(dateObj);

    if (!weekMap[weekKey]) {
      weekMap[weekKey] = {
        weekLabel: `${year}年第${week}周`,
        weekStart,
        weekEnd,
        days: []
      };
    }

    weekMap[weekKey].days.push({
      _id: day._id,
      date: day.date,
      dayLabel: day.dayLabel,
      //images: day.images || [],
      images: (day.images || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(img => ({
          image: img.url
        })),
      events: (eventMap[day._id] || []).map(e => ({
        _id: e._id,
        dayId: day._id,
        title: e.title,
        description: e.description,
        time: e.time,
        priority: e.priority
      }))
    });
  });

  return Object.values(weekMap).map(w => ({
    ...w,
    days: w.days.sort((a, b) => new Date(a.date) - new Date(b.date))
  }));
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  console.log("openid:", openid);
  // 1️⃣ 查询用户时间轴
  const timelineRes = await db.collection('timescales')
    .where({ creatorId: openid, status: 'active' })
    .limit(1)
    .get();

  if (!timelineRes.data.length) {
    return { code: 404, message: '用户时间轴不存在' };
  }
  const timelineId = timelineRes.data[0]._id;
  const [daysRes, eventsRes] = await Promise.all([
    db.collection('days').where({ timescaleId: timelineId }).get(),
    db.collection('events').where({ timescaleId: timelineId }).orderBy('time', 'asc').get()
  ]);

  return {
    code: 0,
    data: {
      timeline: timelineRes.data[0],
      weeks: formatWeeks(daysRes.data, eventsRes.data)
    }
  };
};

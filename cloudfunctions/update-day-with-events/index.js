const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { dayId, dayUpdates, eventUpdates, eventDeletes } = event;
  if (event.date) dayUpdates.date = event.date;
  if (event.weekIndex) dayUpdates.weekIndex = event.weekIndex;
  if (event.dayLabel) dayUpdates.dayLabel = event.dayLabel;
  const db = cloud.database();

  // 更新 Day
  if (dayUpdates && Object.keys(dayUpdates).length) {
    dayUpdates.updatedAt = new Date();
    await db.collection('days').doc(dayId).update({ data: dayUpdates });
  }

  // 删除事件
  if (eventDeletes?.length) {
    const _ = db.command;
    await db.collection('events').where({ _id: _.in(eventDeletes) }).update({ data: { status: 'deleted' } });
  }

  // 更新 / 新增事件
  if (eventUpdates?.length) {
    const batch = db.batch();
    eventUpdates.forEach(ev => {
      if (ev._local) {
        const { _local, ...rest } = ev;
        batch.collection('events').add({ data: { ...rest, dayId, createdAt: new Date() } });
      } else {
        const { _id, ...rest } = ev;
        batch.collection('events').doc(_id).update({ data: rest });
      }
    });
    await batch.commit();
  }

  return { code: 0, message: 'Day & events updated' };
}

// exports.main = async (event, context) => {
//   const {
//     dayId,
//     summary,
//     images,
//     location,
//     events = {}
//   } = event;

//   if (!dayId) {
//     return { code: 400, message: 'dayId required' };
//   }

//   const now = new Date();

//   /* =========================
//    * 1️⃣ 更新 Day（复用你现有逻辑）
//    * ========================= */
//   const updateDayData = {
//     updatedAt: now
//   };

//   if (typeof summary === 'string') {
//     updateDayData.summary = summary;
//   }

//   if (Array.isArray(images)) {
//     updateDayData.images = images.map((img, index) => ({
//       url: img.url,
//       type: img.type || 'image',
//       order: img.order ?? index,
//       width: img.width,
//       height: img.height
//     }));
//   }

//   if (typeof location === 'string') {
//     updateDayData.location = location;
//   }

//   await db
//     .collection('days')
//     .doc(dayId)
//     .update({ data: updateDayData });

//   /* =========================
//    * 2️⃣ 处理 Event
//    * ========================= */

//   const {
//     create = [],
//     update = [],
//     delete: del = []
//   } = events;

//   /* 2.1 新增事件 */
//   const createPromises = create.map(e => {
//     return db.collection('events').add({
//       data: {
//         dayId,
//         timescaleId: e.timescaleId, // ⚠️ 前端可传或后端补
//         title: e.title || '',
//         description: e.description || '',
//         time: e.time || '',
//         priority: e.priority ?? 2,
//         order: e.order ?? 0,
//         status: e.status || 'todo',
//         createdAt: now,
//         updatedAt: now
//       }
//     });
//   });

//   /* 2.2 更新事件 */
//   const updatePromises = update.map(e => {
//     if (!e._id) return Promise.resolve();

//     const updateEventData = {
//       updatedAt: now
//     };

//     if (typeof e.title === 'string') updateEventData.title = e.title;
//     if (typeof e.description === 'string') updateEventData.description = e.description;
//     if (typeof e.time === 'string') updateEventData.time = e.time;
//     if (typeof e.status === 'string') updateEventData.status = e.status;
//     if (typeof e.priority === 'number') updateEventData.priority = e.priority;
//     if (typeof e.order === 'number') updateEventData.order = e.order;

//     return db
//       .collection('events')
//       .doc(e._id)
//       .update({ data: updateEventData });
//   });

//   /* 2.3 删除事件（物理删除）
//    * 👉 如果你想改为软删除，只需 update status = archived
//    */
//   const deletePromises = del.map(e => {
//     if (!e._id) return Promise.resolve();
//     return db.collection('events').doc(e._id).remove();
//   });

//   await Promise.all([
//     ...createPromises,
//     ...updatePromises,
//     ...deletePromises
//   ]);

//   return {
//     code: 0,
//     message: 'Day & Events updated successfully'
//   };
// };
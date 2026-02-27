// 1) Simple test function (keep it)
Parse.Cloud.define("hello", async () => {
  return "Hello from Cloud Code";
});

// 2) Security hook for Task
// Allowed values
const ALLOWED_PRIORITY = ["low", "med", "high"];
const ALLOWED_STATUS = ["todo", "in_progress", "done", "canceled"];

Parse.Cloud.beforeSave("Task", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const task = request.object;

  // On create: set owner + ACL + defaults
  if (!task.existed()) {
    task.set("owner", user);

    // defaults
    if (!task.has("status")) task.set("status", "todo");
    if (!task.has("priority")) task.set("priority", "med");

    const acl = new Parse.ACL(user);
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    task.setACL(acl);
  }

  // Prevent changing owner later
  if (task.existed() && task.dirty("owner")) {
    throw new Error("Cannot change owner");
  }

  // Validate priority
  if (task.has("priority")) {
    const p = task.get("priority");
    if (!ALLOWED_PRIORITY.includes(p)) {
      throw new Error("Invalid priority (low|med|high)");
    }
  }

  // Validate status
  if (task.has("status")) {
    const s = task.get("status");
    if (!ALLOWED_STATUS.includes(s)) {
      throw new Error("Invalid status (todo|in_progress|done|canceled)");
    }
  }

  // Validate dueDate type (must be Date if provided)
  if (task.has("dueDate")) {
    const d = task.get("dueDate");
    if (!(d instanceof Date)) {
      throw new Error("dueDate must be a Date");
    }
  }
});

Parse.Cloud.define("createTask", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const { title, priority, status, dueDate } = request.params;

  if (!title || typeof title !== "string") throw new Error("title is required");

  const task = new Parse.Object("Task");
  task.set("title", title);
  task.set("done", false); // optional legacy; you can remove later

  if (priority) task.set("priority", priority); // validated in beforeSave
  if (status) task.set("status", status);       // validated in beforeSave

  if (dueDate) {
    // accept ISO string like "2026-03-10T12:00:00.000Z"
    const dateObj = new Date(dueDate);
    if (Number.isNaN(dateObj.getTime())) throw new Error("dueDate must be ISO date string");
    task.set("dueDate", dateObj);
  }

  task.set("owner", user);

  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  task.setACL(acl);

  await task.save();

  return {
    id: task.id,
    title: task.get("title"),
    status: task.get("status"),
    priority: task.get("priority"),
    dueDate: task.get("dueDate"),
    createdAt: task.createdAt,
  };
});

Parse.Cloud.define("myTasks", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const query = new Parse.Query("Task");
  query.equalTo("owner", user);
  query.descending("createdAt");

  const results = await query.find();
  return results.map((t) => ({
    id: t.id,
    title: t.get("title"),
    done: t.get("done"),
    createdAt: t.createdAt,
  }));
});

Parse.Cloud.define("toggleTaskDone", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const { taskId, done } = request.params;
  if (!taskId) throw new Error("taskId is required");
  if (typeof done !== "boolean") throw new Error("done must be boolean");

  const query = new Parse.Query("Task");
  query.equalTo("owner", user); // extra safety
  const task = await query.get(taskId); // respects ACL too

  task.set("done", done);
  await task.save();
  return { id: task.id, done: task.get("done") };
});

Parse.Cloud.define("deleteTask", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const { taskId } = request.params;
  if (!taskId) throw new Error("taskId is required");

  const query = new Parse.Query("Task");
  query.equalTo("owner", user);
  const task = await query.get(taskId);

  await task.destroy();
  return { id: taskId, deleted: true };
});

Parse.Cloud.define("tasksByStatus", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const { status, limit = 10, skip = 0 } = request.params;
  if (!status || typeof status !== "string") throw new Error("status is required");

  const lim = Math.min(Math.max(Number(limit) || 10, 1), 50); // 1..50
  const sk = Math.max(Number(skip) || 0, 0);

  const query = new Parse.Query("Task");
  query.equalTo("owner", user);
  query.equalTo("status", status);
  query.descending("createdAt");

  // total count (for pagination UI)
  const total = await query.count();

  // page
  query.limit(lim);
  query.skip(sk);
  const results = await query.find();

  const items = results.map((t) => ({
    id: t.id,
    title: t.get("title"),
    status: t.get("status"),
    priority: t.get("priority"),
    dueDate: t.get("dueDate"),
    createdAt: t.createdAt,
  }));

  const nextSkip = sk + items.length < total ? sk + items.length : null;

  return { items, total, limit: lim, skip: sk, nextSkip };
});

Parse.Cloud.define("setTaskStatus", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const { taskId, status } = request.params;
  if (!taskId) throw new Error("taskId is required");
  if (!status) throw new Error("status is required");

  const query = new Parse.Query("Task");
  query.equalTo("owner", user);

  const task = await query.get(taskId);

  task.set("status", status); // validated in beforeSave
  task.set("done", status === "done"); // keep legacy in sync (optional)

  await task.save();

  return { id: task.id, status: task.get("status") };
});
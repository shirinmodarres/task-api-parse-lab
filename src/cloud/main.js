// 1) Simple test function (keep it)
Parse.Cloud.define("hello", async () => {
  return "Hello from Cloud Code";
});

// 2) Security hook for Task
Parse.Cloud.beforeSave("Task", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const task = request.object;

  // On create: set owner + ACL
  if (!task.existed()) {
    task.set("owner", user);

    const acl = new Parse.ACL(user); // only this user
    acl.setPublicReadAccess(false);
    acl.setPublicWriteAccess(false);
    task.setACL(acl);
  }

  // Prevent changing owner later
  if (task.existed() && task.dirty("owner")) {
    throw new Error("Cannot change owner");
  }
});

Parse.Cloud.define("createTask", async (request) => {
  const user = request.user;
  if (!user) throw new Error("Not authorized");

  const { title } = request.params;
  if (!title || typeof title !== "string") throw new Error("title is required");

  const task = new Parse.Object("Task");
  task.set("title", title);
  task.set("done", false);
  task.set("owner", user);

  const acl = new Parse.ACL(user);
  acl.setPublicReadAccess(false);
  acl.setPublicWriteAccess(false);
  task.setACL(acl);

  await task.save();
  return { id: task.id, title: task.get("title"), done: task.get("done") };
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
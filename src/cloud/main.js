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
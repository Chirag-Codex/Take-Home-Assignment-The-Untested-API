const taskService = require("../src/services/taskService");

describe("taskService", () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe("create", () => {
    it("should create a task with default values and a generated id", () => {
      const task = taskService.create({ title: "Learn Jest" });

      expect(task).toMatchObject({
        title: "Learn Jest",
        description: "",
        status: "todo",
        priority: "medium",
        dueDate: null,
        completedAt: null,
      });
      expect(task.id).toBeDefined();
      expect(task.createdAt).toBeDefined();
    });

    it("should create a task with custom fields when provided", () => {
      const input = {
        title: "Complete Take-Home",
        description: "Finish all steps",
        status: "in_progress",
        priority: "high",
        dueDate: "2026-12-31T23:59:59.000Z",
      };
      const task = taskService.create(input);

      expect(task).toMatchObject(input);
      expect(task.id).toBeDefined();
    });
  });

  describe("getAll", () => {
    it("should return an empty array when no tasks exist", () => {
      expect(taskService.getAll()).toEqual([]);
    });

    it("should return all created tasks", () => {
      const task1 = taskService.create({ title: "Task 1" });
      const task2 = taskService.create({ title: "Task 2" });
      const all = taskService.getAll();

      expect(all).toHaveLength(2);
      expect(all).toEqual([task1, task2]);
    });
  });

  describe("findById", () => {
    it("should find and return a task by its ID", () => {
      const created = taskService.create({ title: "Task to find" });
      const found = taskService.findById(created.id);

      expect(found).toEqual(created);
    });

    it("should return undefined if the task ID does not exist", () => {
      expect(taskService.findById("non-existent-id")).toBeUndefined();
    });
  });

  describe("getByStatus", () => {
    it("should return only tasks matching the exact specified status", () => {
      const t1 = taskService.create({ title: "Task 1", status: "todo" });
      taskService.create({ title: "Task 2", status: "done" });
      taskService.create({ title: "Task 3", status: "in_progress" });

      expect(taskService.getByStatus("todo")).toEqual([t1]);
    });

    // BUG: getByStatus uses .includes() (substring match). See BUGS.md.
    // Remove .failing once fixed.
    it.failing("should not match partial status strings", () => {
      taskService.create({ title: "A", status: "todo" });
      taskService.create({ title: "B", status: "done" });

      expect(taskService.getByStatus("do")).toEqual([]);
    });
  });

  describe("getPaginated", () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    it("should return the first page of items for page=1", () => {
      const page1 = taskService.getPaginated(1, 2);

      expect(page1).toHaveLength(2);
      expect(page1[0].title).toBe("Task 1");
      expect(page1[1].title).toBe("Task 2");
    });

    it("should return the second page of items for page=2", () => {
      const page2 = taskService.getPaginated(2, 2);

      expect(page2).toHaveLength(2);
      expect(page2[0].title).toBe("Task 3");
      expect(page2[1].title).toBe("Task 4");
    });

    it("should return a partial last page", () => {
      const page3 = taskService.getPaginated(3, 2);

      expect(page3).toHaveLength(1);
      expect(page3[0].title).toBe("Task 5");
    });

    it("should return all tasks when limit is larger than the total", () => {
      expect(taskService.getPaginated(1, 10)).toHaveLength(5);
    });

    it("should return an empty array for a page past the end", () => {
      expect(taskService.getPaginated(99, 2)).toEqual([]);
    });
  });

  describe("getStats", () => {
    it("should calculate accurate counts by status and overdue count", () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();
      const futureDate = new Date(Date.now() + 100000).toISOString();

      taskService.create({ title: "T1", status: "todo", dueDate: pastDate }); // overdue
      taskService.create({
        title: "T2",
        status: "in_progress",
        dueDate: futureDate,
      });
      taskService.create({ title: "T3", status: "done", dueDate: pastDate }); // done is never overdue

      expect(taskService.getStats()).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });

    it("should return all zeros when there are no tasks", () => {
      expect(taskService.getStats()).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });
  });

  describe("update", () => {
    it("should update specified fields and return updated task", () => {
      const created = taskService.create({
        title: "Original Title",
        priority: "low",
      });
      const updated = taskService.update(created.id, {
        title: "New Title",
        priority: "high",
      });

      expect(updated.title).toBe("New Title");
      expect(updated.priority).toBe("high");
      expect(taskService.findById(created.id).title).toBe("New Title");
    });

    it("should not change id or createdAt when updating other fields", () => {
      const created = taskService.create({ title: "Keep my identity" });
      const updated = taskService.update(created.id, { title: "Changed" });

      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toBe(created.createdAt);
    });

    it("should not allow overwriting id or createdAt even if passed in update fields", () => {
      const created = taskService.create({ title: "Keep my identity" });
      const updated = taskService.update(created.id, {
        title: "Changed",
        id: "malicious-custom-id",
        createdAt: "2000-01-01T00:00:00.000Z",
      });

      expect(updated.id).toBe(created.id);
      expect(updated.createdAt).toBe(created.createdAt);
      expect(updated.title).toBe("Changed");
      expect(taskService.findById(created.id).id).toBe(created.id);
    });

    it("should return null when updating a non-existent task", () => {
      expect(
        taskService.update("non-existent-id", { title: "New" }),
      ).toBeNull();
    });
  });

  describe("remove", () => {
    it("should remove an existing task and return true", () => {
      const created = taskService.create({ title: "Task to delete" });
      const success = taskService.remove(created.id);

      expect(success).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    it("should return false when removing a non-existent ID", () => {
      expect(taskService.remove("non-existent-id")).toBe(false);
    });
  });

  describe("completeTask", () => {
    // BUG: completeTask resets priority to 'medium'. See BUGS.md.
    // Remove .failing once fixed.
    it.failing(
      "should mark task status as done, set completedAt, and preserve original priority",
      () => {
        const created = taskService.create({
          title: "High priority task",
          priority: "high",
        });
        const completed = taskService.completeTask(created.id);

        expect(completed.status).toBe("done");
        expect(completed.completedAt).toBeDefined();
        expect(completed.priority).toBe("high");
      },
    );

    it("should set status to done and completedAt", () => {
      const created = taskService.create({ title: "Finish me" });
      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe("done");
      expect(completed.completedAt).not.toBeNull();
    });

    it("should return null when completing a non-existent task", () => {
      expect(taskService.completeTask("non-existent-id")).toBeNull();
    });
  });

  describe("assignTask", () => {
    it("should assign a task to a user and set assignee field", () => {
      const task = taskService.create({ title: "Design API" });
      const assigned = taskService.assignTask(task.id, "Chirag");

      expect(assigned.assignee).toBe("Chirag");
      expect(taskService.findById(task.id).assignee).toBe("Chirag");
    });

    it("should allow reassignment and track previousAssignee", () => {
      const task = taskService.create({ title: "Code Review" });
      taskService.assignTask(task.id, "Chirag");
      const reassigned = taskService.assignTask(task.id, "Bob");

      expect(reassigned.assignee).toBe("Bob");
      expect(reassigned.previousAssignee).toBe("Chirag");
    });

    it("should return null when assigning a non-existent task", () => {
      expect(taskService.assignTask("non-existent-id", "Chirag")).toBeNull();
    });
  });
});

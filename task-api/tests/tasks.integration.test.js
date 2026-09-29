const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Tasks API Integration Tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    it('should create a task and return 201 with created task payload', async () => {
      const payload = {
        title: 'Integration Test Task',
        priority: 'high',
      };
      const res = await request(app)
        .post('/tasks')
        .send(payload)
        .expect(201)
        .expect('Content-Type', /json/);

      expect(res.body).toMatchObject({
        title: 'Integration Test Task',
        priority: 'high',
        status: 'todo',
      });
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 if title is missing or whitespace', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: '     ' })
        .expect(400);

      expect(res.body.error).toMatch(/title is required/i);
    });

    it('should return 400 if invalid status is provided', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', status: 'invalid_status' })
        .expect(400);

      expect(res.body.error).toMatch(/status must be one of/i);
    });

    it('should return 400 if dueDate is not a valid date string', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Task', dueDate: 'not-a-date' })
        .expect(400);

      expect(res.body.error).toMatch(/dueDate must be a valid ISO date/i);
    });
  });

  describe('GET /tasks', () => {
    it('should return all tasks when no query parameters are provided', async () => {
      taskService.create({ title: 'Task 1' });
      taskService.create({ title: 'Task 2' });

      const res = await request(app)
        .get('/tasks')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });

    it('should filter tasks by status when ?status= is passed', async () => {
      taskService.create({ title: 'Task Todo', status: 'todo' });
      taskService.create({ title: 'Task Done', status: 'done' });

      const res = await request(app)
        .get('/tasks?status=todo')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('Task Todo');
      expect(res.body[0].status).toBe('todo');
    });

    it('should paginate results when ?page= and ?limit= are passed', async () => {
      for (let i = 1; i <= 5; i++) {
        taskService.create({ title: `Task ${i}` });
      }

      const res = await request(app)
        .get('/tasks?page=1&limit=2')
        .expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].title).toBe('Task 1');
      expect(res.body[1].title).toBe('Task 2');
    });
  });

  describe('GET /tasks/stats', () => {
    it('should return default zero counts when no tasks exist', async () => {
      const res = await request(app)
        .get('/tasks/stats')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(res.body).toEqual({
        todo: 0,
        in_progress: 0,
        done: 0,
        overdue: 0,
      });
    });

    it('should return correct summary counts and overdue counts', async () => {
      const pastDate = new Date(Date.now() - 100000).toISOString();

      taskService.create({ title: 'T1', status: 'todo', dueDate: pastDate });
      taskService.create({ title: 'T2', status: 'in_progress' });
      taskService.create({ title: 'T3', status: 'done', dueDate: pastDate });

      const res = await request(app)
        .get('/tasks/stats')
        .expect(200);

      expect(res.body).toEqual({
        todo: 1,
        in_progress: 1,
        done: 1,
        overdue: 1,
      });
    });
  });

  describe('PUT /tasks/:id', () => {
    it('should update an existing task and return 200', async () => {
      const task = taskService.create({ title: 'Old Title', priority: 'low' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ title: 'New Title', priority: 'high' })
        .expect(200);

      expect(res.body.title).toBe('New Title');
      expect(res.body.priority).toBe('high');
    });

    it('should return 404 if the task id does not exist', async () => {
      const res = await request(app)
        .put('/tasks/non-existent-id')
        .send({ title: 'Updated' })
        .expect(404);

      expect(res.body.error).toMatch(/Task not found/i);
    });

    it('should return 400 if invalid update fields are provided', async () => {
      const task = taskService.create({ title: 'Task' });

      const res = await request(app)
        .put(`/tasks/${task.id}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(res.body.error).toMatch(/status must be one of/i);
    });
  });

  describe('DELETE /tasks/:id', () => {
    it('should delete an existing task and return 204 with empty body', async () => {
      const task = taskService.create({ title: 'Task to delete' });

      await request(app)
        .delete(`/tasks/${task.id}`)
        .expect(204);

      expect(taskService.findById(task.id)).toBeUndefined();
    });

    it('should return 404 when attempting to delete a non-existent task', async () => {
      const res = await request(app)
        .delete('/tasks/non-existent-id')
        .expect(404);

      expect(res.body.error).toMatch(/Task not found/i);
    });
  });

  describe('PATCH /tasks/:id/complete', () => {
    it('should mark a task as completed and return 200 with updated task', async () => {
      const task = taskService.create({ title: 'Task to finish', priority: 'high' });

      const res = await request(app)
        .patch(`/tasks/${task.id}/complete`)
        .expect(200);

      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).toBeDefined();
    });

    it('should return 404 when marking a non-existent task as complete', async () => {
      const res = await request(app)
        .patch('/tasks/non-existent-id/complete')
        .expect(404);

      expect(res.body.error).toMatch(/Task not found/i);
    });
  });
});
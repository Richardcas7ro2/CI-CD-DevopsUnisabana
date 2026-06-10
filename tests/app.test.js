const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  it('should return system info on /api/info', async () => {
    const res = await request(app).get('/api/info');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('hostname');
    expect(res.body).toHaveProperty('platform');
  });

  it('should serve the frontend on /', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('<!DOCTYPE html>');
  });
});

// ============================================================================
// IAM Routes - Identity and Access Management
// ============================================================================

import { Router } from 'express';
import * as usersService from './users.service';
import * as sessionsService from './sessions.service';
import * as apiKeysService from './api-keys.service';

const router = Router();

// User routes
router.get('/users', async (req, res) => {
  try {
    const users = await usersService.listUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await usersService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.post('/users', async (req, res) => {
  try {
    const user = await usersService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const user = await usersService.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    await usersService.deleteUser(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Session routes
router.get('/sessions/:userId', async (req, res) => {
  try {
    const sessions = await sessionsService.findSessionsByUserId(req.params.userId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    await sessionsService.deleteSession(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// API Key routes
router.get('/api-keys/:userId', async (req, res) => {
  try {
    const keys = await apiKeysService.listApiKeys(req.params.userId);
    res.json(keys);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.post('/api-keys', async (req, res) => {
  try {
    const key = await apiKeysService.generateApiKey(req.body);
    res.status(201).json(key);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

router.delete('/api-keys/:id', async (req, res) => {
  try {
    await apiKeysService.revokeApiKey(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

export default router;

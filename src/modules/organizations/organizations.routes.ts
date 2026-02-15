// ============================================================================
// Organizations Routes
// ============================================================================

import { Router } from 'express';
import * as organizationsService from './organizations.service';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const organizations = await organizationsService.listOrganizations();
    res.json(organizations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const organization = await organizationsService.getOrganization(req.params.id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

router.post('/', async (req, res) => {
  try {
    const organization = await organizationsService.createOrganization(req.body);
    res.status(201).json(organization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const organization = await organizationsService.updateOrganization(req.params.id, req.body);
    res.json(organization);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update organization' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await organizationsService.deleteOrganization(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete organization' });
  }
});

export default router;

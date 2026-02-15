// ============================================================================
// Approvals Routes
// ============================================================================

import { Router } from 'express';
import * as approvalsService from './approvals.service';

const router = Router();

router.get('/pending', async (req, res) => {
  try {
    const approvals = await approvalsService.listPendingApprovals();
    res.json(approvals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const approval = await approvalsService.getApproval(req.params.id);
    if (!approval) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approval' });
  }
});

router.post('/:id/decision', async (req, res) => {
  try {
    const approval = await approvalsService.makeDecision(req.params.id, req.body);
    res.json(approval);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process approval decision' });
  }
});

router.get('/chains', async (req, res) => {
  try {
    const chains = await approvalsService.listApprovalChains();
    res.json(chains);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch approval chains' });
  }
});

router.post('/delegate', async (req, res) => {
  try {
    const delegation = await approvalsService.delegateApproval(req.body);
    res.status(201).json(delegation);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delegate approval' });
  }
});

export default router;

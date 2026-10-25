import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Dashboard } from '../pages/Dashboard';
import { Agents } from '../pages/Agents';
import { AgentDetails } from '../pages/AgentDetails';
import { Actions } from '../pages/Actions';
import { ActionDetails } from '../pages/ActionDetails';
import { Approvals } from '../pages/Approvals';
import { Alerts } from '../pages/Alerts';
import { Policies } from '../pages/Policies';
import { ModelEvaluation } from '../pages/ModelEvaluation';
import { GatewaySimulator } from '../pages/GatewaySimulator';
import { NotFound } from '../pages/NotFound';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="agents" element={<Agents />} />
        <Route path="agents/:id" element={<AgentDetails />} />
        <Route path="actions" element={<Actions />} />
        <Route path="actions/:id" element={<ActionDetails />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="policies" element={<Policies />} />
        <Route path="model-evaluation" element={<ModelEvaluation />} />
        <Route path="simulator" element={<GatewaySimulator />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

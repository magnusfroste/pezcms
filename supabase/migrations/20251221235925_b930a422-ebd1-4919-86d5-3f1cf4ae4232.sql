-- Lead status enum
CREATE TYPE public.lead_status AS ENUM ('lead', 'opportunity', 'customer', 'lost');

-- Leads table - minimal but complete
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  company TEXT,
  phone TEXT,
  source TEXT NOT NULL DEFAULT 'form', -- form, manual, import
  source_id TEXT, -- reference to form_submission, etc
  status lead_status NOT NULL DEFAULT 'lead',
  score INTEGER DEFAULT 0,
  ai_summary TEXT,
  ai_qualified_at TIMESTAMP WITH TIME ZONE,
  needs_review BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES public.profiles(id),
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  CONSTRAINT leads_email_unique UNIQUE (email)
);

-- Lead activities - tracks all interactions
CREATE TABLE public.lead_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- form_submit, email_open, link_click, status_change, note, call
  metadata JSONB DEFAULT '{}'::jsonb,
  points INTEGER DEFAULT 0, -- score points for this activity
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for leads
CREATE POLICY "Admins can manage leads"
ON public.leads FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approvers can view and update leads"
ON public.leads FOR SELECT
USING (has_role(auth.uid(), 'approver'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Approvers can update leads"
ON public.leads FOR UPDATE
USING (has_role(auth.uid(), 'approver'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert leads"
ON public.leads FOR INSERT
WITH CHECK (true);

-- RLS Policies for lead_activities
CREATE POLICY "Authenticated can view lead activities"
ON public.lead_activities FOR SELECT
USING (has_role(auth.uid(), 'approver'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert lead activities"
ON public.lead_activities FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_score ON public.leads(score DESC);
CREATE INDEX idx_leads_needs_review ON public.leads(needs_review) WHERE needs_review = true;
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_lead_activities_lead_id ON public.lead_activities(lead_id);
CREATE INDEX idx_lead_activities_type ON public.lead_activities(type);
CREATE INDEX idx_lead_activities_created_at ON public.lead_activities(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

export type LeadStatus = 'lead' | 'opportunity' | 'customer' | 'lost';

export interface Lead {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  phone: string | null;
  source: string;
  source_id: string | null;
  status: LeadStatus;
  score: number;
  ai_summary: string | null;
  ai_qualified_at: string | null;
  needs_review: boolean;
  assigned_to: string | null;
  converted_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface LeadActivity {
  id: string;
  lead_id: string;
  type: string;
  metadata: Record<string, unknown>;
  points: number;
  created_at: string;
}

// Activity point values
const ACTIVITY_POINTS: Record<string, number> = {
  form_submit: 10,
  email_open: 3,
  link_click: 5,
  page_visit: 2,
  newsletter_subscribe: 8,
  status_change: 0,
  note: 0,
  call: 5,
};

/**
 * Create or update a lead from form submission
 */
export async function createLeadFromForm(options: {
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  formName: string;
  formData: Record<string, unknown>;
  sourceId?: string;
  pageId?: string;
}): Promise<{ lead: Lead | null; isNew: boolean; error: string | null }> {
  const { email, name, company, phone, formName, formData, sourceId, pageId } = options;

  try {
    // Check if lead exists
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingLead) {
      // Lead exists - add activity
      await addLeadActivity({
        leadId: existingLead.id,
        type: 'form_submit',
        metadata: {
          form_name: formName,
          form_data: formData,
          page_id: pageId,
        },
      });

      // Trigger AI qualification
      qualifyLead(existingLead.id);

      return { lead: existingLead as Lead, isNew: false, error: null };
    }

    // Create new lead
    const { data: newLead, error: insertError } = await supabase
      .from('leads')
      .insert({
        email,
        name: name || null,
        company: company || null,
        phone: phone || null,
        source: 'form',
        source_id: sourceId || null,
        status: 'lead',
        score: ACTIVITY_POINTS.form_submit,
        needs_review: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create lead:', insertError);
      return { lead: null, isNew: false, error: insertError.message };
    }

    // Add initial activity
    await addLeadActivity({
      leadId: newLead.id,
      type: 'form_submit',
      metadata: {
        form_name: formName,
        form_data: formData,
        page_id: pageId,
        is_initial: true,
      },
    });

    // Trigger AI qualification (async, don't wait)
    qualifyLead(newLead.id);

    return { lead: newLead as Lead, isNew: true, error: null };
  } catch (error) {
    console.error('createLeadFromForm error:', error);
    return { lead: null, isNew: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Add activity to a lead
 */
export async function addLeadActivity(options: {
  leadId: string;
  type: string;
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; error: string | null }> {
  const { leadId, type, metadata = {} } = options;
  const points = ACTIVITY_POINTS[type] || 0;

  try {
    const { error } = await supabase
      .from('lead_activities')
      .insert([{
        lead_id: leadId,
        type,
        metadata: metadata as Json,
        points,
      }]);

    if (error) {
      console.error('Failed to add lead activity:', error);
      return { success: false, error: error.message };
    }

    // Update lead score
    const { data: activities } = await supabase
      .from('lead_activities')
      .select('points')
      .eq('lead_id', leadId);

    if (activities) {
      const totalScore = activities.reduce((sum, a) => sum + (a.points || 0), 0);
      await supabase
        .from('leads')
        .update({ score: totalScore })
        .eq('id', leadId);
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('addLeadActivity error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Track newsletter activity for a lead
 */
export async function trackNewsletterActivity(options: {
  email: string;
  type: 'email_open' | 'link_click';
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { email, type, metadata = {} } = options;

  try {
    // Find lead by email
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (lead) {
      await addLeadActivity({
        leadId: lead.id,
        type,
        metadata,
      });
    }
  } catch (error) {
    console.error('trackNewsletterActivity error:', error);
  }
}

/**
 * Trigger AI qualification for a lead (fire-and-forget)
 */
export async function qualifyLead(leadId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('qualify-lead', {
      body: { leadId },
    });

    if (error) {
      console.warn('Lead qualification failed:', error);
    }
  } catch (error) {
    console.warn('qualifyLead error:', error);
  }
}

/**
 * Get lead status display info
 */
export function getLeadStatusInfo(status: LeadStatus): { label: string; color: string } {
  const statusMap: Record<LeadStatus, { label: string; color: string }> = {
    lead: { label: 'Lead', color: 'bg-blue-500' },
    opportunity: { label: 'Opportunity', color: 'bg-amber-500' },
    customer: { label: 'Kund', color: 'bg-green-500' },
    lost: { label: 'Förlorad', color: 'bg-gray-500' },
  };
  return statusMap[status] || statusMap.lead;
}

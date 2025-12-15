import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ContentApiResponse {
  slug: string;
  title: string;
  status: string;
  blocks: Array<{
    id: string;
    type: string;
    data: Record<string, unknown>;
  }>;
  meta: {
    description?: string;
    keywords?: string[];
    ogImage?: string;
    seoTitle?: string;
  };
  updatedAt: string;
  publishedAt?: string;
  _links: {
    self: string;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  
  // Expected path: /content-api/page/:slug or /content-api/pages
  console.log('[Content API] Request path:', url.pathname, 'Parts:', pathParts);

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Route: GET /content-api/pages - List all published pages
    if (pathParts.length === 1 && pathParts[0] === 'pages') {
      console.log('[Content API] Fetching all published pages');
      
      const { data: pages, error } = await supabase
        .from('pages')
        .select('slug, title, status, meta_json, updated_at')
        .eq('status', 'published')
        .order('menu_order', { ascending: true });

      if (error) {
        console.error('[Content API] Database error:', error);
        throw error;
      }

      const response = {
        pages: pages?.map(page => ({
          slug: page.slug,
          title: page.title,
          status: page.status,
          meta: {
            description: page.meta_json?.description,
            seoTitle: page.meta_json?.seoTitle,
          },
          updatedAt: page.updated_at,
          _links: {
            self: `/content-api/page/${page.slug}`,
          },
        })) || [],
        total: pages?.length || 0,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route: GET /content-api/page/:slug - Get single page
    if (pathParts.length === 2 && pathParts[0] === 'page') {
      const slug = pathParts[1];
      console.log('[Content API] Fetching page:', slug);

      const { data: page, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'published')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return new Response(
            JSON.stringify({ error: 'Page not found', slug }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('[Content API] Database error:', error);
        throw error;
      }

      const response: ContentApiResponse = {
        slug: page.slug,
        title: page.title,
        status: page.status,
        blocks: (page.content_json || []).map((block: Record<string, unknown>) => ({
          id: block.id,
          type: block.type,
          data: block.data,
        })),
        meta: {
          description: page.meta_json?.description,
          keywords: page.meta_json?.keywords,
          ogImage: page.meta_json?.og_image,
          seoTitle: page.meta_json?.seoTitle,
        },
        updatedAt: page.updated_at,
        _links: {
          self: `/content-api/page/${page.slug}`,
        },
      };

      console.log('[Content API] Returning page with', response.blocks.length, 'blocks');

      return new Response(JSON.stringify(response), {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      });
    }

    // Unknown route
    return new Response(
      JSON.stringify({ 
        error: 'Not found',
        availableRoutes: [
          'GET /content-api/pages',
          'GET /content-api/page/:slug',
        ],
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Content API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BLOCK_TYPES_SCHEMA = `
Available CMS block types:
1. hero - Hero section with title, subtitle, background image, optional CTA button
   Data: { title: string, subtitle?: string, backgroundImage?: string, primaryButton?: { text: string, url: string } }

2. text - Rich text content block
   Data: { content: string } // HTML content

3. image - Single image block
   Data: { src: string, alt?: string, caption?: string }

4. two-column - Two column layout with text and image
   Data: { content: string, imageSrc?: string, imageAlt?: string, imagePosition: 'left' | 'right' }

5. cta - Call to action block
   Data: { title: string, subtitle?: string, buttonText: string, buttonUrl: string }

6. link-grid - Grid of link cards with icons
   Data: { links: [{ title: string, description?: string, url: string, icon?: string }], columns: 2 | 3 | 4 }

7. article-grid - Grid of article cards
   Data: { title?: string, articles: [{ title: string, excerpt?: string, url: string, image?: string }], columns: 2 | 3 | 4 }

8. accordion - FAQ/Accordion sections
   Data: { title?: string, items: [{ question: string, answer: string }] }

9. info-box - Highlighted info box
   Data: { title?: string, content: string, variant: 'info' | 'warning' | 'success' | 'error' }

10. quote - Blockquote with attribution
    Data: { quote: string, author?: string, role?: string }

11. stats - Statistics display
    Data: { title?: string, stats: [{ value: string, label: string }] }

12. contact - Contact information block
    Data: { title?: string, phone?: string, email?: string, address?: string, hours?: string }

13. separator - Visual separator
    Data: { style: 'line' | 'dots' | 'space' }

14. youtube - YouTube video embed
    Data: { videoId: string, title?: string }

15. gallery - Image gallery
    Data: { images: [{ src: string, alt?: string, caption?: string }], columns: 2 | 3 | 4 }
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL krävs' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'FIRECRAWL_API_KEY saknas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!lovableKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'LOVABLE_API_KEY saknas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Step 1: Scraping URL with Firecrawl:', formattedUrl);

    // Step 1: Scrape with Firecrawl
    const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
      }),
    });

    const scrapeData = await scrapeResponse.json();

    if (!scrapeResponse.ok) {
      console.error('Firecrawl error:', scrapeData);
      return new Response(
        JSON.stringify({ success: false, error: `Kunde inte scrapa sidan: ${scrapeData.error || scrapeResponse.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';
    const html = scrapeData.data?.html || scrapeData.html || '';
    const metadata = scrapeData.data?.metadata || scrapeData.metadata || {};

    console.log('Step 2: Scraped content length:', markdown.length, 'chars');
    console.log('Metadata:', JSON.stringify(metadata));

    // Step 2: Use AI to map content to blocks
    console.log('Step 3: Mapping content to CMS blocks with AI...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Du är en expert på att analysera webbsidor och mappa innehåll till CMS-block.
Din uppgift är att ta innehåll från en scrapad webbsida och omvandla det till strukturerade CMS-block.

${BLOCK_TYPES_SCHEMA}

=== VIKTIGA REGLER ===

FILTRERING - IGNORERA DETTA INNEHÅLL:
- Navigationsmenyer (topbar, sidomeny, footer-länkar)
- Brödsmulor (breadcrumbs)
- "Tillbaka"-länkar och navigeringslänkar
- Cookie-banners och popup-meddelanden
- Sidofält med relaterade länkar (om de inte är huvudinnehåll)
- Upprepade menystrukturer
Fokusera ENDAST på huvudinnehållet (det som normalt ligger i <main> eller artikelområdet).

STRUKTURANALYS:
1. Om sidan har en tydlig hero/banner-sektion med stor rubrik, använd "hero" block
2. Behåll all viktig text, bilder och media från huvudinnehållet
3. Gruppera relaterat innehåll logiskt i lämpliga block

YOUTUBE-VIDEOR - KRITISKT VIKTIGT:
- Sök igenom HELA innehållet efter YouTube-länkar i ALLA format:
  * youtube.com/watch?v=VIDEO_ID (ta endast VIDEO_ID före eventuella &-tecken)
  * youtube.com/watch?v=VIDEO_ID&embeds_referring_euri=... (ignorera allt efter &)
  * youtu.be/VIDEO_ID
  * youtube.com/embed/VIDEO_ID
  * youtube-nocookie.com/embed/VIDEO_ID
- För varje YouTube-video, skapa ett "youtube" block med:
  * videoId: endast video-ID:t (11 tecken, t.ex. "dQw4w9WgXcQ")
  * title: rubrik från omgivande kontext eller "Video"
- Kontrollera HTML för <iframe> med YouTube-URL:er

CITAT OCH TESTIMONIALS:
- Leta efter mönster som:
  * "Citerad text" — Namn, Roll
  * "Citerad text" - Namn
  * Blockquotes med attribution
  * Studentberättelser, patientberättelser, etc.
- Skapa "quote" block med: quote, author, role

FAKTARUTOR OCH STATISTIK:
- Sektioner med rubrik "Fakta om...", "Om programmet", "Snabbfakta" etc.
- Nyckelfakta som: antal poäng, längd, start, plats
- Skapa "stats" block för siffror/nyckeltal
- Skapa "info-box" block för faktarutor med blandad info

LÄNKGRUPPER OCH KNAPPAR:
- Grupper av knappar eller länkar som ligger tillsammans
- "Läs mer"-kort, relaterade sidor, utbildningskort
- Skapa "link-grid" block för navigeringslänkar
- Skapa "article-grid" för artikelkort med bild + rubrik + excerpt

GENERELLT:
- Använd "text" block för löpande text och artikelinnehåll
- Använd "accordion" för FAQ-sektioner
- Använd "two-column" för text + bild layouts
- Använd "separator" mellan tydliga sektioner

=== SVARSFORMAT ===
Svara ENDAST med valid JSON, ingen annan text:
{
  "title": "Sidans huvudrubrik",
  "blocks": [
    { "id": "block-1", "type": "hero", "data": { "title": "...", "subtitle": "..." } },
    { "id": "block-2", "type": "youtube", "data": { "videoId": "ABC123xyz", "title": "Video om programmet" } },
    { "id": "block-3", "type": "quote", "data": { "quote": "...", "author": "Namn", "role": "Student" } },
    { "id": "block-4", "type": "stats", "data": { "stats": [{ "value": "180", "label": "Högskolepoäng" }] } }
  ]
}`
          },
          {
            role: 'user',
            content: `Analysera denna webbsida och skapa CMS-block:

URL: ${formattedUrl}
Titel: ${metadata.title || 'Okänd'}
Beskrivning: ${metadata.description || 'Ingen'}

=== HUVUDINNEHÅLL (Markdown) ===
${markdown.substring(0, 18000)}
${markdown.length > 18000 ? '\n... (innehållet är trunkerat)' : ''}

=== HTML FÖR YOUTUBE/IFRAME-SÖKNING ===
${html.substring(0, 8000)}

=== INSTRUKTIONER ===
1. Filtrera bort navigationsinnehåll, fokusera på huvudinnehållet
2. Hitta ALLA YouTube-videor och skapa "youtube" block för varje
3. Identifiera citat/testimonials och skapa "quote" block
4. Identifiera faktarutor och skapa "stats" eller "info-box" block
5. Gruppera länksamlingar till "link-grid" eller "article-grid"

Svara endast med JSON.`
          }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const aiError = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, aiError);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit överskriden. Försök igen om en stund.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI-krediter slut. Lägg till mer i Lovable Settings.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ success: false, error: 'AI-analys misslyckades' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices?.[0]?.message?.content || '';
    
    console.log('Step 4: AI response received, parsing...');

    // Parse AI response - extract JSON from possible markdown code blocks
    let parsedBlocks;
    try {
      // Try to extract JSON from code blocks first
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonString = jsonMatch ? jsonMatch[1].trim() : aiContent.trim();
      parsedBlocks = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiContent.substring(0, 500));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Kunde inte tolka AI-svaret',
          rawResponse: aiContent.substring(0, 1000)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ensure blocks have unique IDs
    const blocks = (parsedBlocks.blocks || []).map((block: any, index: number) => ({
      ...block,
      id: block.id || `block-${Date.now()}-${index}`,
    }));

    console.log('Step 5: Successfully mapped', blocks.length, 'blocks');

    return new Response(
      JSON.stringify({
        success: true,
        sourceUrl: formattedUrl,
        title: parsedBlocks.title || metadata.title || 'Importerad sida',
        blocks,
        metadata: {
          originalTitle: metadata.title,
          originalDescription: metadata.description,
          scrapedAt: new Date().toISOString(),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Ett oväntat fel uppstod' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

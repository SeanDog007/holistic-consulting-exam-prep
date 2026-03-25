/**
 * Import Domain 1 (Food & Nutrition) full curriculum + structure for Domains 2-5
 * Run: SUPABASE_SERVICE_ROLE_KEY=... node import-domain1.mjs
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://uvzfhksyjqadkxypcocq.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SERVICE_KEY) {
  console.error('ERROR: Set SUPABASE_SERVICE_ROLE_KEY env var before running.');
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// ═══════════════════════════════════════════════════════════════
// MODULE DEFINITIONS — ALL 5 DOMAINS
// ═══════════════════════════════════════════════════════════════

const ALL_MODULES = [
  // Domain 1: Food & Nutrition
  { domain: 1, module_order: 1, title: 'Macronutrient Foundations', description: 'Proteins, carbohydrates, fats, and fiber — their structures, metabolic roles, and clinical significance in holistic nutrition practice.' },
  { domain: 1, module_order: 2, title: 'Micronutrient Systems', description: 'Water-soluble and fat-soluble vitamins, major minerals, and trace elements — absorption, synergies, deficiency signs, and therapeutic applications.' },
  { domain: 1, module_order: 3, title: 'Functional Foods & Bioactive Compounds', description: 'Antioxidants, phytonutrients, probiotics, and culinary herbs — the bioactive compounds that support health beyond basic nutrition.' },
  { domain: 1, module_order: 4, title: 'Food Quality & Safety', description: 'Whole vs. processed foods, organic standards, environmental toxins, food sensitivities, and allergies — evaluating food quality for client recommendations.' },
  { domain: 1, module_order: 5, title: 'Dietary Systems & Special Populations', description: 'Comparative dietary philosophies and nutritional considerations across the lifespan, from prenatal through geriatric populations.' },

  // Domain 2: Anatomy, Physiology & Biochemistry
  { domain: 2, module_order: 1, title: 'Body Systems Overview', description: 'Foundational anatomy and physiology of the major body systems and their interconnections relevant to holistic nutrition practice.' },
  { domain: 2, module_order: 2, title: 'Digestive System & Nutrient Absorption', description: 'Detailed study of the GI tract, digestive processes, nutrient absorption mechanisms, and the gut microbiome.' },
  { domain: 2, module_order: 3, title: 'Endocrine & Metabolic Systems', description: 'Hormonal regulation, metabolic pathways, blood sugar balance, thyroid function, and adrenal health.' },
  { domain: 2, module_order: 4, title: 'Cellular Biochemistry', description: 'Cellular energy production, oxidative stress, detoxification pathways, and biochemical individuality.' },

  // Domain 3: Professional Practice
  { domain: 3, module_order: 1, title: 'Scope of Practice & Legal Framework', description: 'Understanding the holistic nutrition consultant scope of practice, legal boundaries, referral protocols, and regulatory considerations.' },
  { domain: 3, module_order: 2, title: 'Counseling & Client Communication', description: 'Motivational interviewing, active listening, behavior change models, and effective client education strategies.' },
  { domain: 3, module_order: 3, title: 'Ethics & Professional Conduct', description: 'Ethical principles, confidentiality, informed consent, professional boundaries, and continuing education requirements.' },

  // Domain 4: Clinical Applications
  { domain: 4, module_order: 1, title: 'Clinical Assessment', description: 'Nutritional assessment methods, health history intake, functional lab interpretation, and clinical decision-making.' },
  { domain: 4, module_order: 2, title: 'GI Conditions', description: 'Nutritional management of IBS, GERD, leaky gut, SIBO, Crohn\'s disease, ulcerative colitis, and other gastrointestinal conditions.' },
  { domain: 4, module_order: 3, title: 'Metabolic & Endocrine Conditions', description: 'Nutritional strategies for diabetes, metabolic syndrome, thyroid disorders, adrenal dysfunction, and hormonal imbalances.' },
  { domain: 4, module_order: 4, title: 'Neurological & Mental Health', description: 'The gut-brain axis, nutritional support for anxiety, depression, cognitive decline, ADHD, and neuroinflammation.' },
  { domain: 4, module_order: 5, title: 'Musculoskeletal Skin & Other Systems', description: 'Nutritional approaches for joint health, osteoporosis, skin conditions, autoimmune disorders, and cardiovascular health.' },
  { domain: 4, module_order: 6, title: 'Clinical Tools & Interactions', description: 'Supplement protocols, herb-drug interactions, functional testing interpretation, and clinical decision frameworks.' },

  // Domain 5: Research & Evidence
  { domain: 5, module_order: 1, title: 'Research Design', description: 'Types of research studies, experimental design, sampling methods, and understanding variables in nutrition research.' },
  { domain: 5, module_order: 2, title: 'Evidence Evaluation', description: 'Critical appraisal of research, identifying bias, evaluating statistical significance, and assessing study quality.' },
  { domain: 5, module_order: 3, title: 'Applying Research', description: 'Translating research findings into clinical practice, evidence-based decision making, and staying current with nutrition science.' },
];

// ═══════════════════════════════════════════════════════════════
// DOMAIN 1 LESSONS — FULL CONTENT
// ═══════════════════════════════════════════════════════════════

function domain1Lessons(moduleIdMap) {
  return [

    // ── Module 1: Macronutrient Foundations ──────────────────────
    {
      module_id: moduleIdMap['1-1'],
      lesson_order: 1,
      title: 'Proteins & Amino Acids',
      subtitle: 'Building blocks of structure, enzymes, and immune function',
      estimated_minutes: 18,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Proteins are composed of 20 amino acids, 9 of which are essential and must come from the diet.',
        'Complete proteins contain all essential amino acids; complementary combining can achieve completeness from plant sources.',
        'Protein quality is measured by PDCAAS and DIAAS scores — important for clinical recommendations.',
        'Deficiency signs include muscle wasting, edema, poor wound healing, and weakened immunity.',
        'Excess protein intake can stress the kidneys and liver, particularly in those with pre-existing conditions.'
      ]),
      content_html: `
<h2>Proteins &amp; Amino Acids</h2>

<h3>What Are Proteins?</h3>
<p>Proteins are large, complex macromolecules composed of amino acid chains linked by peptide bonds. They are essential to virtually every biological process in the human body, from structural support (collagen, keratin) to enzymatic catalysis (digestive enzymes, metabolic enzymes), immune defense (immunoglobulins), transport (hemoglobin, albumin), and signaling (peptide hormones like insulin).</p>

<p>The human body uses <strong>20 amino acids</strong> to build proteins. Of these, <strong>9 are essential</strong> (histidine, isoleucine, leucine, lysine, methionine, phenylalanine, threonine, tryptophan, and valine), meaning the body cannot synthesize them and they must be obtained from food. The remaining 11 are considered non-essential or conditionally essential, the latter becoming essential during periods of illness, stress, or rapid growth.</p>

<h3>Complete vs. Incomplete Proteins</h3>
<p>A <strong>complete protein</strong> contains all nine essential amino acids in adequate proportions. Animal sources — meat, poultry, fish, eggs, and dairy — are generally complete proteins. Among plant foods, soy, quinoa, hemp seeds, and buckwheat are notable complete protein sources.</p>

<p><strong>Incomplete proteins</strong> lack one or more essential amino acids. Most plant proteins fall into this category. However, through <strong>complementary combining</strong> — eating different plant proteins over the course of a day — individuals can obtain all essential amino acids. Classic combinations include beans with rice, hummus with pita, and lentils with nuts. Current research indicates these combinations do not need to occur at the same meal, but rather within the same day.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Know the difference between complete and incomplete proteins and be able to identify examples of each. The exam frequently tests knowledge of complementary protein combining and which plant foods are complete proteins (soy, quinoa, hemp, buckwheat).</div>

<h3>Protein Quality Assessment</h3>
<p>Two primary scoring systems measure protein quality:</p>
<ul>
  <li><strong>PDCAAS (Protein Digestibility-Corrected Amino Acid Score):</strong> The traditional standard adopted by the WHO. It evaluates amino acid profile relative to human requirements and corrects for digestibility. Scores range from 0 to 1.0, with egg, casein, and soy achieving perfect scores.</li>
  <li><strong>DIAAS (Digestible Indispensable Amino Acid Score):</strong> The newer, more precise metric that measures ileal (small intestine) digestibility of individual amino acids rather than fecal digestibility. DIAAS can exceed 1.0, giving more nuanced differentiation among high-quality proteins.</li>
</ul>

<h3>Protein Digestion and Absorption</h3>
<p>Protein digestion begins in the stomach where hydrochloric acid denatures protein structure and activates pepsinogen into pepsin, which cleaves proteins into smaller polypeptides. In the small intestine, pancreatic proteases (trypsin, chymotrypsin, carboxypeptidase) further break polypeptides into di- and tripeptides and free amino acids. Brush border enzymes complete the process, and amino acids are absorbed via active transport into the portal blood supply and carried to the liver.</p>

<p>Adequate <strong>stomach acid (HCl)</strong> is critical for protein digestion. Hypochlorhydria (low stomach acid), common in older adults and those on proton pump inhibitors, can impair protein breakdown and amino acid absorption.</p>

<div class="callout"><strong>Clinical Note:</strong> Clients presenting with bloating after high-protein meals, brittle nails, thinning hair, or poor wound healing may have inadequate protein digestion. Consider digestive support such as betaine HCl with pepsin (contraindicated in those with active ulcers or gastritis) or plant-based digestive enzyme blends.</div>

<h3>Functions of Key Amino Acids</h3>
<ul>
  <li><strong>Leucine:</strong> The primary driver of muscle protein synthesis via the mTOR pathway. Critical for recovery and sarcopenia prevention.</li>
  <li><strong>Tryptophan:</strong> Precursor to serotonin and melatonin. Influences mood, sleep, and appetite regulation.</li>
  <li><strong>Glutamine:</strong> The most abundant amino acid in the body. Fuel for enterocytes (intestinal lining cells) and critical for gut barrier integrity and immune function.</li>
  <li><strong>Glycine:</strong> Required for collagen synthesis, phase II liver detoxification (conjugation), and the production of glutathione, the body's master antioxidant.</li>
  <li><strong>Tyrosine:</strong> Precursor to thyroid hormones (T3, T4) and catecholamines (dopamine, norepinephrine, epinephrine).</li>
</ul>

<h3>Clinical Considerations</h3>
<p>Protein needs vary by life stage and health status. The general RDA of 0.8 g/kg body weight is considered a minimum to prevent deficiency, not an optimal amount. Athletes, pregnant and lactating women, older adults, and those recovering from surgery or illness often require 1.2 to 2.0 g/kg. Holistic practitioners should individualize recommendations based on activity level, digestive capacity, and health goals.</p>

<p>Signs of <strong>protein deficiency</strong> include muscle wasting, edema (due to low albumin and decreased oncotic pressure), frequent infections, slow wound healing, hair loss, and brittle nails. Severe deficiency manifests as kwashiorkor (edematous malnutrition) or marasmus (wasting).</p>

<p>Conversely, consistently excessive protein intake — particularly from animal sources — may increase the burden on the kidneys (elevated BUN and creatinine), promote an acidic internal environment, and displace fiber-rich plant foods from the diet. Clients with chronic kidney disease require careful protein management under medical supervision.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Be prepared to identify signs of protein deficiency and know that the RDA of 0.8 g/kg is a minimum baseline, not the recommendation for all populations. Questions may ask about specific amino acid functions — especially glutamine for gut health and tryptophan for serotonin production.</div>
`
    },

    {
      module_id: moduleIdMap['1-1'],
      lesson_order: 2,
      title: 'Carbohydrates & Glycemic Index',
      subtitle: 'Energy metabolism, blood sugar regulation, and clinical significance',
      estimated_minutes: 17,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Carbohydrates are classified as simple (mono/disaccharides) or complex (oligosaccharides/polysaccharides) based on molecular structure.',
        'The glycemic index (GI) ranks foods by their effect on blood glucose; glycemic load (GL) accounts for portion size and is more clinically relevant.',
        'Insulin resistance develops from chronic blood sugar dysregulation and is a precursor to type 2 diabetes and metabolic syndrome.',
        'Complex carbohydrates from whole food sources provide sustained energy, fiber, and micronutrients.',
        'Low-GI diets are associated with improved blood sugar control, reduced cardiovascular risk, and better weight management.'
      ]),
      content_html: `
<h2>Carbohydrates &amp; Glycemic Index</h2>

<h3>Classification of Carbohydrates</h3>
<p>Carbohydrates are organic compounds composed of carbon, hydrogen, and oxygen. They serve as the body's primary and most readily available energy source, providing 4 calories per gram. Carbohydrates are classified by molecular complexity:</p>

<ul>
  <li><strong>Monosaccharides</strong> (single sugars): Glucose (blood sugar), fructose (fruit sugar), and galactose (component of lactose). These are the simplest forms and require no digestion for absorption.</li>
  <li><strong>Disaccharides</strong> (two sugars): Sucrose (glucose + fructose, found in table sugar and many fruits), lactose (glucose + galactose, found in dairy), and maltose (glucose + glucose, formed during starch digestion).</li>
  <li><strong>Oligosaccharides</strong> (3-10 sugars): Include fructooligosaccharides (FOS) and galactooligosaccharides (GOS), which serve as prebiotics that feed beneficial gut bacteria.</li>
  <li><strong>Polysaccharides</strong> (many sugars): Starch (plant energy storage), glycogen (animal/human energy storage in liver and muscle), and dietary fiber (cellulose, hemicellulose, pectin, beta-glucan).</li>
</ul>

<h3>Carbohydrate Digestion</h3>
<p>Carbohydrate digestion begins in the mouth with <strong>salivary amylase</strong>, which starts breaking starch into maltose. This process pauses in the acidic stomach, then resumes in the small intestine where <strong>pancreatic amylase</strong> continues starch breakdown. Brush border enzymes (maltase, sucrase, lactase) complete the conversion to monosaccharides for absorption into the portal circulation.</p>

<p>Individuals lacking sufficient lactase (the enzyme that cleaves lactose) experience <strong>lactose intolerance</strong> — undigested lactose ferments in the colon, producing gas, bloating, and diarrhea. Lactase persistence into adulthood is genetically determined and varies significantly by ethnicity.</p>

<h3>The Glycemic Index (GI) and Glycemic Load (GL)</h3>
<p>The <strong>glycemic index</strong> is a numerical ranking system (0-100) that measures how rapidly a carbohydrate-containing food raises blood glucose compared to a reference food (pure glucose = 100 or white bread = 100, depending on the scale). Foods are categorized as:</p>
<ul>
  <li><strong>Low GI:</strong> 55 or below (lentils, most non-starchy vegetables, steel-cut oats, berries)</li>
  <li><strong>Medium GI:</strong> 56-69 (brown rice, sweet potato, whole wheat bread)</li>
  <li><strong>High GI:</strong> 70 and above (white bread, white rice, instant oatmeal, sugary cereals)</li>
</ul>

<p>The <strong>glycemic load (GL)</strong> provides a more clinically useful measure because it accounts for both the GI and the actual amount of carbohydrate in a typical serving. GL is calculated as: GI x grams of carbohydrate per serving / 100. A GL of 10 or less is low, 11-19 is medium, and 20 or above is high.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Understand the difference between GI and GL. The exam may present scenarios where a food has a high GI but a low GL due to small carbohydrate content per serving (e.g., watermelon: GI ~72 but GL ~4 per typical serving). GL is generally considered more clinically relevant.</div>

<h3>Blood Sugar Regulation</h3>
<p>When blood glucose rises after a meal, the pancreatic beta cells release <strong>insulin</strong>, which signals cells to uptake glucose for energy or storage as glycogen. When blood glucose drops between meals or during exercise, the pancreatic alpha cells release <strong>glucagon</strong>, which triggers glycogenolysis (glycogen breakdown) and gluconeogenesis (new glucose production from amino acids and glycerol) in the liver.</p>

<p>Chronic consumption of high-GI, refined carbohydrates leads to repeated blood sugar spikes and excessive insulin secretion. Over time, cells become less responsive to insulin's signal — a condition called <strong>insulin resistance</strong>. This is a central mechanism in the development of metabolic syndrome, type 2 diabetes, polycystic ovarian syndrome (PCOS), and non-alcoholic fatty liver disease (NAFLD).</p>

<div class="callout"><strong>Clinical Note:</strong> Signs of blood sugar dysregulation in clients include energy crashes after meals, sugar and carbohydrate cravings, irritability when meals are delayed (often called "hanger"), difficulty concentrating, afternoon fatigue, and central adiposity. Transitioning clients toward lower-GI whole food carbohydrates, pairing carbohydrates with protein and healthy fats, and establishing regular meal timing are foundational interventions.</div>

<h3>Factors That Influence Glycemic Response</h3>
<p>Several factors modify a food's glycemic impact beyond its inherent GI value:</p>
<ul>
  <li><strong>Fiber content:</strong> Soluble fiber slows gastric emptying and glucose absorption.</li>
  <li><strong>Fat and protein:</strong> Consuming fats and proteins alongside carbohydrates slows digestion and blunts the glucose spike.</li>
  <li><strong>Cooking and processing:</strong> Greater processing generally increases GI. Al dente pasta has a lower GI than overcooked pasta. Cooling cooked starches (rice, potatoes) increases resistant starch content, lowering GI.</li>
  <li><strong>Ripeness:</strong> Riper fruits have higher sugar content and higher GI than less ripe ones.</li>
  <li><strong>Acidity:</strong> Vinegar and lemon juice lower the glycemic response of a meal.</li>
</ul>

<h3>Clinical Applications</h3>
<p>Holistic nutrition practitioners should guide clients toward <strong>whole, minimally processed carbohydrate sources</strong> — vegetables, legumes, whole grains, and fruits — while reducing refined sugars and processed starches. Carbohydrate needs are highly individual and influenced by activity level, metabolic health, gut health, and genetic factors. There is no single ideal carbohydrate intake; rather, the quality and context of carbohydrate consumption matter most for long-term health outcomes.</p>
`
    },

    {
      module_id: moduleIdMap['1-1'],
      lesson_order: 3,
      title: 'Fats & Essential Fatty Acids',
      subtitle: 'Lipid classification, omega balance, and anti-inflammatory nutrition',
      estimated_minutes: 18,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Dietary fats are classified as saturated, monounsaturated, and polyunsaturated; trans fats are the most harmful and should be eliminated.',
        'Omega-3 (ALA, EPA, DHA) and omega-6 (LA, AA) are essential fatty acids — the modern diet tends to be excessively high in omega-6.',
        'An optimal omega-6 to omega-3 ratio of approximately 2:1 to 4:1 supports anti-inflammatory balance.',
        'Fat-soluble vitamins (A, D, E, K) require dietary fat for proper absorption.',
        'Medium-chain triglycerides (MCTs) are absorbed directly into portal circulation and are a rapid energy source.'
      ]),
      content_html: `
<h2>Fats &amp; Essential Fatty Acids</h2>

<h3>Overview of Dietary Fats</h3>
<p>Dietary fats (lipids) are a dense energy source providing <strong>9 calories per gram</strong> — more than double that of carbohydrates or protein. Beyond energy, fats serve critical roles as structural components of cell membranes (phospholipid bilayer), precursors to signaling molecules (prostaglandins, thromboxanes, leukotrienes), vehicles for fat-soluble vitamin absorption, insulation and organ protection, and components of myelin sheaths that coat nerves.</p>

<h3>Classification of Fatty Acids</h3>
<p>Fatty acids are classified by their degree of hydrogen saturation and the presence of double bonds in the carbon chain:</p>

<ul>
  <li><strong>Saturated fatty acids (SFAs):</strong> No double bonds; all carbon atoms are fully saturated with hydrogen. Solid at room temperature. Found in butter, coconut oil, palm oil, lard, and fatty cuts of meat. While historically demonized, current evidence suggests SFAs have a more nuanced role, with chain length and food matrix influencing health effects.</li>
  <li><strong>Monounsaturated fatty acids (MUFAs):</strong> One double bond. Liquid at room temperature, semi-solid when refrigerated. The primary dietary MUFA is oleic acid (omega-9), abundant in olive oil, avocados, almonds, and macadamia nuts. MUFAs are associated with reduced cardiovascular risk and improved insulin sensitivity.</li>
  <li><strong>Polyunsaturated fatty acids (PUFAs):</strong> Two or more double bonds. Liquid at room temperature and when refrigerated. Include the essential fatty acid families omega-3 and omega-6.</li>
  <li><strong>Trans fatty acids:</strong> Industrially produced through partial hydrogenation of vegetable oils. Associated with significantly increased cardiovascular disease risk, inflammation, and insulin resistance. Largely banned or restricted in most countries. Small amounts of naturally occurring trans fats (e.g., conjugated linoleic acid in grass-fed dairy) have different health effects.</li>
</ul>

<div class="exam-tip"><strong>Exam Tip:</strong> Be able to classify fatty acids and provide food source examples. Know that trans fats are the most harmful category and are associated with increased LDL, decreased HDL, and systemic inflammation. The exam may test your ability to distinguish between industrial trans fats and naturally occurring CLA.</div>

<h3>Essential Fatty Acids</h3>
<p>Two fatty acids are classified as <strong>essential</strong> because the human body cannot synthesize them:</p>

<ul>
  <li><strong>Alpha-linolenic acid (ALA) — Omega-3:</strong> Found in flaxseed, chia seeds, hemp seeds, walnuts, and their oils. ALA can be converted to the longer-chain omega-3s EPA and DHA, but conversion rates are low (approximately 5-10% for EPA and 2-5% for DHA).</li>
  <li><strong>Linoleic acid (LA) — Omega-6:</strong> Found in vegetable oils (sunflower, safflower, corn, soybean), nuts, and seeds. LA is converted to arachidonic acid (AA), which is a precursor to pro-inflammatory eicosanoids.</li>
</ul>

<p>The longer-chain omega-3 fatty acids — <strong>EPA (eicosapentaenoic acid)</strong> and <strong>DHA (docosahexaenoic acid)</strong> — are found preformed in fatty cold-water fish (salmon, mackerel, sardines, herring, anchovies), fish oil, krill oil, and algae-based supplements. EPA is primarily anti-inflammatory, while DHA is critical for brain structure, retinal function, and neurological development.</p>

<h3>The Omega-6 to Omega-3 Ratio</h3>
<p>Both omega-6 and omega-3 fatty acids compete for the same enzymes (delta-6 desaturase and elongase) in their conversion pathways. When the diet is heavily skewed toward omega-6 — as is typical in the standard American diet, where ratios may reach 15:1 to 25:1 — the production of pro-inflammatory eicosanoids from arachidonic acid predominates. An optimal ratio of approximately <strong>2:1 to 4:1</strong> (omega-6 to omega-3) supports a balanced inflammatory response.</p>

<div class="callout"><strong>Clinical Note:</strong> To improve the omega ratio, recommend that clients increase consumption of fatty fish (2-3 servings per week), add ground flaxseed and chia seeds to meals, use olive oil instead of corn or soybean oil, and consider a high-quality fish oil or algae-based omega-3 supplement (1-2 g combined EPA/DHA daily for general health, higher for inflammatory conditions under practitioner guidance).</div>

<h3>Fat Digestion and Absorption</h3>
<p>Fat digestion requires <strong>bile salts</strong> (produced by the liver, stored in the gallbladder) for emulsification, and <strong>pancreatic lipase</strong> for enzymatic breakdown into monoglycerides and free fatty acids. These are absorbed into enterocytes, repackaged into chylomicrons, and transported via the lymphatic system into the bloodstream.</p>

<p><strong>Medium-chain triglycerides (MCTs)</strong>, found predominantly in coconut oil and palm kernel oil, bypass the standard fat digestion process. They are absorbed directly into the portal vein and transported to the liver for rapid oxidation, making them a quick energy source. MCTs are clinically useful for clients with fat malabsorption, gallbladder dysfunction, or pancreatic insufficiency.</p>

<h3>Clinical Considerations</h3>
<p>Clients who have undergone <strong>cholecystectomy</strong> (gallbladder removal) may struggle with fat digestion and benefit from supplemental ox bile or lipase enzymes. Signs of inadequate fat digestion include pale or floating stools (steatorrhea), fat-soluble vitamin deficiencies, and bloating after fatty meals. Adequate dietary fat is essential not only for energy but also for hormone production (steroid hormones are derived from cholesterol), brain health (the brain is approximately 60% fat by dry weight), and the absorption of vitamins A, D, E, and K.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Memorize the omega-3 conversion pathway: ALA → EPA → DHA (with low conversion efficiency). Know that EPA is primarily anti-inflammatory and DHA is primarily structural (brain and retina). The exam may also ask about MCT absorption — remember they bypass the lymphatic system and go directly to the liver via the portal vein.</div>
`
    },

    {
      module_id: moduleIdMap['1-1'],
      lesson_order: 4,
      title: 'Fiber & Digestive Support',
      subtitle: 'Soluble and insoluble fiber, resistant starch, and gut health',
      estimated_minutes: 15,
      exam_alert: false,
      key_takeaways: JSON.stringify([
        'Soluble fiber dissolves in water, forms a gel, and helps lower cholesterol and regulate blood sugar; insoluble fiber adds bulk and promotes regularity.',
        'Resistant starch functions similarly to soluble fiber and is fermented by gut bacteria to produce short-chain fatty acids (SCFAs), especially butyrate.',
        'Butyrate is the primary fuel for colonocytes and supports gut barrier integrity and anti-inflammatory signaling.',
        'The recommended fiber intake is 25-35 g per day for adults, but most Americans consume only 15 g.',
        'Fiber intake should be increased gradually to prevent gas, bloating, and cramping; adequate hydration is essential.'
      ]),
      content_html: `
<h2>Fiber &amp; Digestive Support</h2>

<h3>What Is Dietary Fiber?</h3>
<p>Dietary fiber consists of plant-derived carbohydrates and lignin that resist digestion by human enzymes in the small intestine. Unlike other carbohydrates, fiber passes relatively intact through the stomach and small intestine and reaches the colon, where it may be partially or fully fermented by the resident microbiota. Fiber is categorized by its solubility in water, which determines its physiological effects.</p>

<h3>Soluble Fiber</h3>
<p><strong>Soluble fiber</strong> dissolves in water to form a viscous gel-like substance. This gel slows gastric emptying, delays glucose absorption (helping regulate blood sugar), and binds to bile acids in the small intestine, promoting their excretion and thereby lowering LDL cholesterol (the liver must pull cholesterol from the bloodstream to synthesize new bile acids).</p>

<p>Key types and food sources of soluble fiber include:</p>
<ul>
  <li><strong>Beta-glucan:</strong> Found in oats and barley. Well-studied for cholesterol-lowering effects. The FDA allows a health claim for oat beta-glucan and heart disease risk reduction.</li>
  <li><strong>Pectin:</strong> Found in apples, citrus fruits, berries, and plums. Used commercially as a gelling agent in jams. Supports beneficial gut bacteria.</li>
  <li><strong>Inulin and FOS (fructooligosaccharides):</strong> Found in chicory root, garlic, onions, leeks, asparagus, and Jerusalem artichokes. Potent prebiotics that selectively feed Bifidobacteria and Lactobacilli.</li>
  <li><strong>Psyllium husk:</strong> From the Plantago ovata plant. Used therapeutically for both constipation and diarrhea due to its water-binding capacity. Forms a bulk-producing gel.</li>
  <li><strong>Guar gum and acacia fiber:</strong> Soluble fibers used in supplements and food products. Well-tolerated and support microbial diversity.</li>
</ul>

<h3>Insoluble Fiber</h3>
<p><strong>Insoluble fiber</strong> does not dissolve in water. It adds bulk to stool, accelerates transit time through the colon, and helps prevent constipation and diverticular disease. Insoluble fiber acts like a "broom" sweeping material through the digestive tract.</p>

<p>Key types and food sources include:</p>
<ul>
  <li><strong>Cellulose:</strong> The structural component of plant cell walls. Found in whole grains, bran, nuts, seeds, and the skins of fruits and vegetables.</li>
  <li><strong>Hemicellulose:</strong> Found in whole grains, bran, and vegetables. Partially fermentable.</li>
  <li><strong>Lignin:</strong> A non-carbohydrate structural component found in the woody parts of plants, flaxseeds, and root vegetables. Completely resistant to fermentation.</li>
</ul>

<div class="callout"><strong>Clinical Note:</strong> When increasing fiber in a client's diet, advise a gradual approach — adding 3-5 grams per week — to allow the gut microbiome to adapt. Rapid increases in fiber can cause gas, bloating, and abdominal discomfort. Always pair increased fiber intake with adequate water consumption (at least 8 cups per day) to prevent constipation. For clients with IBS, note that high-FODMAP fibers (inulin, FOS, GOS) may exacerbate symptoms and a low-FODMAP approach may be indicated initially.</div>

<h3>Resistant Starch</h3>
<p><strong>Resistant starch (RS)</strong> is a form of starch that escapes small intestine digestion and reaches the colon intact, where it functions similarly to soluble fiber. There are four types:</p>
<ul>
  <li><strong>RS1:</strong> Physically inaccessible starch trapped within intact cell walls (whole grains, legumes).</li>
  <li><strong>RS2:</strong> Granular starch with a crystalline structure resistant to digestion (green bananas, raw potatoes, high-amylose corn).</li>
  <li><strong>RS3:</strong> Retrograded starch formed when cooked starchy foods are cooled (cooled rice, cooled potatoes, overnight oats).</li>
  <li><strong>RS4:</strong> Chemically modified starches (industrial food additives).</li>
</ul>

<p>When gut bacteria ferment resistant starch and soluble fibers, they produce <strong>short-chain fatty acids (SCFAs)</strong> — primarily butyrate, propionate, and acetate. <strong>Butyrate</strong> is the preferred fuel source for colonocytes (colon lining cells), supports gut barrier integrity, reduces intestinal permeability ("leaky gut"), and has anti-inflammatory and anti-carcinogenic properties. Propionate travels to the liver where it modulates cholesterol synthesis, while acetate enters systemic circulation and influences appetite regulation.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Know the four types of resistant starch and the three main SCFAs (butyrate, propionate, acetate). Butyrate's role as the primary fuel for colonocytes and its importance for gut barrier integrity is a high-yield topic. Also remember that RS3 (retrograded starch) is formed by cooking and cooling — a practical tip to share with clients.</div>

<h3>Fiber Recommendations and Clinical Applications</h3>
<p>The general recommendation for dietary fiber is <strong>25-35 grams per day</strong> for adults (the Institute of Medicine recommends 25 g for women and 38 g for men). However, average intake in the Western diet is only about 15 grams. Increasing fiber intake through a variety of whole plant foods — rather than relying solely on supplements — provides the additional benefits of vitamins, minerals, and phytonutrients.</p>

<p>Therapeutic applications of fiber include management of constipation, diarrhea (soluble fiber absorbs excess water), irritable bowel syndrome (carefully selected fiber types), diverticular disease prevention, blood sugar regulation in diabetes and metabolic syndrome, cholesterol reduction, weight management (fiber increases satiety), and supporting a healthy, diverse gut microbiome.</p>
`
    },

    // ── Module 2: Micronutrient Systems ─────────────────────────
    {
      module_id: moduleIdMap['1-2'],
      lesson_order: 1,
      title: 'Water-Soluble Vitamins (B-complex, C)',
      subtitle: 'Absorption, function, and clinical relevance of the water-soluble vitamins',
      estimated_minutes: 20,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Water-soluble vitamins are not stored in significant quantities and must be consumed regularly; excess is generally excreted in urine.',
        'The B-complex vitamins function as coenzymes in energy metabolism, methylation, neurotransmitter synthesis, and red blood cell formation.',
        'B12 deficiency is common in vegans, older adults, and those with low stomach acid or pernicious anemia — it causes megaloblastic anemia and neurological damage.',
        'Folate (B9) is critical for neural tube development and is a key player in the methylation cycle alongside B12 and B6.',
        'Vitamin C is a potent antioxidant, essential for collagen synthesis, immune function, and enhances non-heme iron absorption.'
      ]),
      content_html: `
<h2>Water-Soluble Vitamins (B-complex, C)</h2>

<h3>General Characteristics</h3>
<p>Water-soluble vitamins dissolve in water and are generally not stored in significant quantities in the body (with the exception of vitamin B12, which is stored in the liver). Because they are readily excreted via the kidneys, toxicity is rare but consistent dietary intake is essential to prevent deficiency. Water-soluble vitamins include the eight B-complex vitamins and vitamin C.</p>

<h3>The B-Complex Vitamins</h3>
<p>The B vitamins function primarily as <strong>coenzymes</strong> — molecules that assist enzymes in catalyzing metabolic reactions. They are essential for converting food into cellular energy (ATP), synthesizing neurotransmitters, maintaining healthy red blood cells, and supporting methylation reactions.</p>

<p><strong>Vitamin B1 (Thiamine):</strong> Coenzyme in carbohydrate metabolism (pyruvate dehydrogenase complex). Deficiency causes beriberi (peripheral neuropathy, cardiovascular dysfunction) and Wernicke-Korsakoff syndrome (associated with chronic alcohol use). Food sources include whole grains, legumes, pork, and sunflower seeds.</p>

<p><strong>Vitamin B2 (Riboflavin):</strong> Component of FAD and FMN, coenzymes in the electron transport chain and numerous oxidation-reduction reactions. Deficiency (ariboflavinosis) presents as cracked lips (cheilosis), sore tongue (glossitis), and light sensitivity. Found in dairy, eggs, almonds, mushrooms, and leafy greens.</p>

<p><strong>Vitamin B3 (Niacin):</strong> Component of NAD and NADP, critical for energy metabolism, DNA repair, and cellular signaling. Deficiency causes pellagra — the classic "3 Ds": dermatitis, diarrhea, and dementia (plus death if untreated). Found in poultry, fish, legumes, mushrooms, and can be synthesized from tryptophan (60 mg tryptophan yields approximately 1 mg niacin).</p>

<p><strong>Vitamin B5 (Pantothenic Acid):</strong> Component of Coenzyme A (CoA), central to fatty acid synthesis and oxidation, and the citric acid cycle. Deficiency is rare due to its widespread presence in foods ("pantothenic" derives from the Greek for "everywhere"). Found in organ meats, avocados, mushrooms, and sweet potatoes.</p>

<p><strong>Vitamin B6 (Pyridoxine):</strong> Coenzyme in over 100 enzymatic reactions, including amino acid metabolism, neurotransmitter synthesis (serotonin, dopamine, GABA), hemoglobin formation, and the methylation cycle. Deficiency presents as peripheral neuropathy, microcytic anemia, depression, and confusion. Food sources include poultry, fish, potatoes, bananas, and chickpeas.</p>

<div class="callout"><strong>Clinical Note:</strong> Vitamin B6 is commonly depleted by oral contraceptives, which may contribute to mood changes in some women. Consider B6 assessment in female clients presenting with PMS symptoms, mood disturbances, or those taking hormonal contraception. Supplementation should generally stay below 100 mg/day to avoid sensory neuropathy.</div>

<p><strong>Vitamin B7 (Biotin):</strong> Coenzyme in carboxylase enzymes involved in gluconeogenesis, fatty acid synthesis, and amino acid catabolism. Deficiency is uncommon but may be induced by excessive raw egg white consumption (avidin in raw egg whites binds biotin). Supports healthy hair, skin, and nails. Found in eggs, nuts, seeds, salmon, and sweet potatoes.</p>

<p><strong>Vitamin B9 (Folate):</strong> Essential for DNA synthesis, cell division, and the methylation cycle. Deficiency causes megaloblastic anemia and, during pregnancy, neural tube defects (spina bifida, anencephaly). Folate and folic acid (the synthetic form) are not identical — individuals with MTHFR gene polymorphisms may have difficulty converting folic acid to its active form, methylfolate (5-MTHF). Rich food sources include dark leafy greens, legumes, asparagus, and citrus fruits.</p>

<p><strong>Vitamin B12 (Cobalamin):</strong> Required for DNA synthesis, red blood cell formation, myelin maintenance, and the methylation cycle (converting homocysteine to methionine). B12 is unique among water-soluble vitamins in requiring <strong>intrinsic factor</strong> (produced by gastric parietal cells) for absorption in the ileum. Deficiency causes megaloblastic anemia and irreversible neurological damage (peripheral neuropathy, cognitive decline). Exclusively found in animal products — vegans must supplement. At-risk groups include older adults (decreased HCl and intrinsic factor), those with pernicious anemia, and individuals taking metformin or PPIs.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> The B12-folate connection is heavily tested. Both deficiencies cause megaloblastic anemia, but only B12 deficiency causes neurological damage. Supplementing folate can mask a B12 deficiency by correcting the anemia while neurological damage progresses — this is called the "folate trap." Also know the MTHFR polymorphism and its impact on folate metabolism.</div>

<h3>Vitamin C (Ascorbic Acid)</h3>
<p>Vitamin C is a powerful <strong>water-soluble antioxidant</strong> that donates electrons to neutralize free radicals. Its key functions include:</p>
<ul>
  <li><strong>Collagen synthesis:</strong> Required cofactor for prolyl and lysyl hydroxylase enzymes. Deficiency causes scurvy — characterized by bleeding gums, poor wound healing, petechiae, joint pain, and fatigue.</li>
  <li><strong>Immune function:</strong> Supports neutrophil chemotaxis, phagocytosis, and lymphocyte proliferation. Accumulates in immune cells at concentrations 10-100 times higher than plasma levels.</li>
  <li><strong>Iron absorption:</strong> Reduces ferric iron (Fe3+) to ferrous iron (Fe2+) in the gut, significantly enhancing non-heme iron absorption. Consuming vitamin C-rich foods alongside plant-based iron sources is a key clinical recommendation.</li>
  <li><strong>Antioxidant recycling:</strong> Regenerates oxidized vitamin E, extending its antioxidant capacity.</li>
</ul>

<p>Rich food sources include bell peppers, citrus fruits, strawberries, kiwi, broccoli, Brussels sprouts, and papaya. Vitamin C is sensitive to heat, light, and oxygen — raw or lightly cooked sources provide the highest levels. While the RDA is 75-90 mg, many holistic practitioners recommend higher intakes (500-2000 mg) for therapeutic purposes, titrating to bowel tolerance.</p>
`
    },

    {
      module_id: moduleIdMap['1-2'],
      lesson_order: 2,
      title: 'Fat-Soluble Vitamins (A, D, E, K)',
      subtitle: 'Storage, toxicity risk, and critical roles in immunity, bone health, and coagulation',
      estimated_minutes: 18,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Fat-soluble vitamins (A, D, E, K) require dietary fat for absorption and are stored in the liver and adipose tissue — toxicity is possible with excessive supplementation.',
        'Vitamin A exists as retinol (preformed, animal sources) and beta-carotene (provitamin A, plant sources); it is essential for vision, immunity, and cell differentiation.',
        'Vitamin D functions as a hormone, regulating calcium absorption, bone health, immune modulation, and mood — deficiency is widespread.',
        'Vitamin E (tocopherols/tocotrienols) is the primary fat-soluble antioxidant protecting cell membranes from lipid peroxidation.',
        'Vitamin K1 (phylloquinone) supports blood clotting while K2 (menaquinone) directs calcium into bones and away from arteries.'
      ]),
      content_html: `
<h2>Fat-Soluble Vitamins (A, D, E, K)</h2>

<h3>General Characteristics</h3>
<p>The fat-soluble vitamins — A, D, E, and K — are absorbed along with dietary fats in the small intestine, transported via chylomicrons through the lymphatic system, and stored in the liver and adipose tissue. Because they accumulate in the body, <strong>toxicity (hypervitaminosis)</strong> is possible with excessive supplementation, particularly for vitamins A and D. Adequate bile production and fat digestion are prerequisites for their absorption — clients with gallbladder dysfunction, fat malabsorption, or very low-fat diets are at increased risk of deficiency.</p>

<h3>Vitamin A</h3>
<p>Vitamin A exists in two primary dietary forms:</p>
<ul>
  <li><strong>Preformed vitamin A (retinol/retinoids):</strong> Found in animal products — liver (the richest source), egg yolks, dairy, and fatty fish. Directly bioavailable.</li>
  <li><strong>Provitamin A carotenoids (beta-carotene, alpha-carotene, beta-cryptoxanthin):</strong> Found in orange, yellow, red, and dark green plant foods — carrots, sweet potatoes, spinach, kale, butternut squash, and mangoes. Converted to retinol in the small intestine as needed, with highly variable conversion efficiency (approximately 12:1 ratio for beta-carotene to retinol).</li>
</ul>

<p><strong>Key functions:</strong> Vision (retinal is a component of rhodopsin in rod cells, essential for night vision), immune function (maintains mucosal barrier integrity and supports T-cell and natural killer cell activity), cell differentiation and growth, reproduction, and skin health.</p>

<p><strong>Deficiency signs:</strong> Night blindness (earliest sign), xerophthalmia (dry eyes), impaired immunity, poor wound healing, hyperkeratosis (rough, bumpy skin), and increased susceptibility to respiratory infections. Vitamin A deficiency is a leading cause of preventable childhood blindness worldwide.</p>

<div class="callout"><strong>Clinical Note:</strong> Preformed vitamin A (retinol) is teratogenic at high doses — pregnant women should not exceed 3,000 mcg RAE (10,000 IU) daily and should avoid liver consumption and high-dose retinol supplements. Beta-carotene from food is safe during pregnancy as the body regulates its conversion. High beta-carotene intake may cause carotenodermia (yellowish skin), which is harmless and reversible.</div>

<h3>Vitamin D</h3>
<p>Vitamin D is unique because it functions more as a <strong>steroid hormone</strong> than a traditional vitamin. The body can synthesize it when UVB radiation from sunlight converts 7-dehydrocholesterol in the skin to cholecalciferol (vitamin D3). This is then hydroxylated in the liver to 25(OH)D (the form measured in blood tests) and further activated in the kidneys to 1,25(OH)2D (calcitriol), the biologically active hormone.</p>

<p><strong>Key functions:</strong> Regulates calcium and phosphorus absorption in the intestine, supports bone mineralization (works synergistically with vitamin K2), modulates immune function (both innate and adaptive), influences mood and cognitive function, and supports muscle function.</p>

<p><strong>Deficiency</strong> is extremely common — estimated to affect 40-75% of the global population. Risk factors include northern latitudes, darker skin pigmentation, obesity (vitamin D is sequestered in adipose tissue), aging, sunscreen use, and limited sun exposure. Deficiency causes rickets in children and osteomalacia in adults, and is associated with increased risk of autoimmune disease, depression, cardiovascular disease, and certain cancers.</p>

<p>Dietary sources include fatty fish, cod liver oil, egg yolks, and fortified foods. Vitamin D3 (cholecalciferol, from animal sources or lichen) is preferred over D2 (ergocalciferol, from fungi) for supplementation, as D3 raises and maintains serum levels more effectively.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Know the vitamin D activation pathway: skin synthesis or dietary intake → liver (25-hydroxylation) → kidney (1,25-dihydroxylation = active calcitriol). The blood test measures 25(OH)D. Optimal levels are generally considered 40-60 ng/mL in functional/holistic practice, though the conventional "sufficient" cutoff is 30 ng/mL.</div>

<h3>Vitamin E</h3>
<p>Vitamin E is a family of eight compounds — four tocopherols and four tocotrienols (alpha, beta, gamma, delta forms of each). <strong>Alpha-tocopherol</strong> is the most biologically active form in humans and the form preferentially retained by the liver's alpha-tocopherol transfer protein.</p>

<p><strong>Primary function:</strong> The body's major <strong>fat-soluble antioxidant</strong>, protecting polyunsaturated fatty acids in cell membranes from lipid peroxidation by free radicals. Works synergistically with vitamin C (which regenerates oxidized vitamin E) and selenium (a cofactor for glutathione peroxidase).</p>

<p>Food sources include wheat germ oil, sunflower seeds, almonds, hazelnuts, avocado, spinach, and olive oil. Deficiency is rare but may occur in fat malabsorption disorders, presenting as peripheral neuropathy and hemolytic anemia. High-dose supplementation (above 400 IU) has shown mixed results in clinical trials and may increase bleeding risk, particularly when combined with anticoagulant medications.</p>

<h3>Vitamin K</h3>
<p>Vitamin K exists in two primary forms:</p>
<ul>
  <li><strong>K1 (phylloquinone):</strong> Found in green leafy vegetables (kale, spinach, collards, Swiss chard, broccoli). Primary dietary form. Essential for the synthesis of clotting factors (II, VII, IX, X) in the liver.</li>
  <li><strong>K2 (menaquinone):</strong> Produced by gut bacteria and found in fermented foods (natto, sauerkraut), hard cheeses, egg yolks, and dark chicken meat. K2 activates osteocalcin (which deposits calcium in bones) and matrix Gla protein (which prevents calcium deposition in arteries). The most studied forms are MK-4 (short-acting) and MK-7 (longer half-life, more effective at lower doses).</li>
</ul>

<div class="callout"><strong>Clinical Note:</strong> The synergy between vitamins D3 and K2 is clinically significant. Vitamin D increases calcium absorption, but without adequate K2, that calcium may deposit in soft tissues and arteries rather than in bone. Recommending D3 and K2 together is a best practice for bone health and cardiovascular protection. Clients on warfarin (Coumadin) must maintain consistent vitamin K intake, as it directly opposes the drug's anticoagulant mechanism.</div>
`
    },

    {
      module_id: moduleIdMap['1-2'],
      lesson_order: 3,
      title: 'Major Minerals (Ca, Mg, K, Na, P)',
      subtitle: 'Electrolyte balance, bone health, and cardiovascular function',
      estimated_minutes: 18,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Calcium and phosphorus are the primary structural minerals of bone; calcium also regulates muscle contraction, nerve signaling, and blood clotting.',
        'Magnesium is a cofactor in over 300 enzymatic reactions and is commonly deficient — involved in energy production, muscle relaxation, and nervous system regulation.',
        'Potassium and sodium work as opposing electrolytes to regulate blood pressure, fluid balance, and nerve transmission.',
        'The modern diet tends to be excessively high in sodium and deficient in potassium, contributing to hypertension.',
        'Mineral absorption is influenced by cofactors (vitamin D for calcium), inhibitors (phytates, oxalates), and the form of the mineral consumed.'
      ]),
      content_html: `
<h2>Major Minerals (Ca, Mg, K, Na, P)</h2>

<h3>Overview</h3>
<p>Major minerals (also called macrominerals) are needed in quantities greater than 100 mg per day. They include calcium, magnesium, potassium, sodium, phosphorus, chloride, and sulfur. These minerals maintain structural integrity, regulate fluid balance, enable nerve impulse transmission, and catalyze enzymatic reactions throughout the body.</p>

<h3>Calcium (Ca)</h3>
<p>Calcium is the most abundant mineral in the human body, with approximately <strong>99% stored in bones and teeth</strong> as hydroxyapatite crystals. The remaining 1% circulates in blood and soft tissues, performing critical functions including muscle contraction, nerve impulse transmission, blood clotting (coagulation cascade), hormone secretion, and enzyme activation.</p>

<p>Blood calcium levels are tightly regulated by <strong>parathyroid hormone (PTH)</strong>, <strong>calcitonin</strong>, and <strong>active vitamin D (calcitriol)</strong>. When serum calcium drops, PTH stimulates bone resorption (releasing calcium from bone stores), increases renal calcium reabsorption, and activates vitamin D to enhance intestinal calcium absorption. Chronic low calcium intake forces the body to continuously draw from bone reserves, contributing to osteopenia and osteoporosis over time.</p>

<p><strong>Food sources:</strong> Dairy products, sardines with bones, calcium-set tofu, fortified plant milks, kale, broccoli, bok choy, and almonds. Dairy is the most bioavailable source, but many plant sources are well-absorbed, with the notable exception of spinach (high in oxalates that bind calcium and reduce absorption to approximately 5%).</p>

<div class="callout"><strong>Clinical Note:</strong> Calcium supplements should be taken in divided doses of no more than 500 mg at a time for optimal absorption. Calcium citrate is better absorbed on an empty stomach and is preferred for clients with low stomach acid. Calcium carbonate requires stomach acid for absorption and should be taken with meals. Always pair calcium supplementation with adequate vitamin D and K2 to ensure proper utilization and prevent arterial calcification.</div>

<h3>Magnesium (Mg)</h3>
<p>Magnesium is a cofactor in over <strong>300 enzymatic reactions</strong>, including ATP production (Mg-ATP is the biologically active form of ATP), protein synthesis, muscle and nerve function, blood glucose regulation, and blood pressure control. It is also required for DNA and RNA synthesis, the production of glutathione, and active transport of calcium and potassium across cell membranes.</p>

<p>Approximately 60% of body magnesium is in bone, 39% in soft tissues and muscle, and only 1% in blood serum — making serum magnesium a poor indicator of total body status. <strong>Subclinical magnesium deficiency</strong> is estimated to affect 50-80% of the population due to soil depletion, refined food processing, chronic stress (which increases magnesium excretion), and medications (PPIs, diuretics).</p>

<p><strong>Deficiency signs:</strong> Muscle cramps and spasms, anxiety, insomnia, constipation, headaches and migraines, heart palpitations, restless leg syndrome, and PMS symptoms. Severe deficiency causes tetany, seizures, and cardiac arrhythmias.</p>

<p><strong>Food sources:</strong> Pumpkin seeds, dark chocolate, almonds, spinach, Swiss chard, avocado, black beans, and whole grains. Various supplemental forms have different characteristics: magnesium glycinate (well-absorbed, calming, minimal GI effects), magnesium citrate (good absorption, osmotic laxative effect), magnesium threonate (crosses the blood-brain barrier, studied for cognition), and magnesium oxide (poorly absorbed, strong laxative).</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Magnesium is one of the most commonly tested minerals. Know its role in ATP production (Mg-ATP), its widespread deficiency, key deficiency signs (cramps, anxiety, insomnia, constipation), and the different supplemental forms and their characteristics. The exam may also test the antagonistic relationship between calcium and magnesium — excess calcium can inhibit magnesium absorption.</div>

<h3>Potassium (K)</h3>
<p>Potassium is the primary <strong>intracellular cation</strong>, maintaining cell membrane potential, fluid balance, and nerve impulse transmission. It works in opposition to sodium: potassium promotes vasodilation and sodium excretion, thereby helping to lower blood pressure. The sodium-potassium ATPase pump actively transports 3 sodium ions out and 2 potassium ions into each cell, maintaining the electrochemical gradient essential for muscle contraction and nerve signaling.</p>

<p>The adequate intake for potassium is 2,600-3,400 mg per day, but most adults consume far less. Rich food sources include bananas, sweet potatoes, avocados, spinach, coconut water, white beans, salmon, and yogurt. Deficiency (hypokalemia) causes muscle weakness, cramping, cardiac arrhythmias, and fatigue.</p>

<h3>Sodium (Na)</h3>
<p>Sodium is the primary <strong>extracellular cation</strong>, essential for fluid balance, nerve impulse transmission, and nutrient absorption (sodium-glucose cotransporter in the small intestine). The modern diet provides excessive sodium — averaging 3,400 mg daily compared to the recommended limit of 2,300 mg — primarily from processed and restaurant foods rather than table salt.</p>

<p>Chronic excessive sodium intake is strongly associated with <strong>hypertension</strong>, and the dietary potassium-to-sodium ratio is considered more predictive of cardiovascular outcomes than sodium intake alone. Increasing potassium-rich whole foods while reducing processed food intake naturally improves this ratio.</p>

<h3>Phosphorus (P)</h3>
<p>Phosphorus is the second most abundant mineral in the body after calcium. Approximately 85% is in bones and teeth as calcium phosphate. The remainder is critical for energy production (ATP, ADP, AMP), DNA and RNA structure (the phosphate backbone), phospholipid cell membranes, and acid-base buffering. Phosphorus is abundant in protein-rich foods (meat, dairy, legumes, nuts) and phosphate additives in processed foods. Deficiency is rare, but excessive intake from processed foods can disrupt the calcium-to-phosphorus ratio, potentially impairing bone health by increasing PTH secretion.</p>
`
    },

    {
      module_id: moduleIdMap['1-2'],
      lesson_order: 4,
      title: 'Trace Minerals & Electrolytes (Fe, Zn, Se, I, Cr, Cu, Mn)',
      subtitle: 'Essential micromineral functions, deficiency patterns, and clinical applications',
      estimated_minutes: 20,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Iron exists as heme (animal sources, well-absorbed) and non-heme (plant sources, absorption enhanced by vitamin C and inhibited by calcium, tannins, and phytates).',
        'Zinc supports over 300 enzymes, is critical for immune function, wound healing, and taste/smell — deficiency impairs immunity and causes delayed wound healing.',
        'Selenium is essential for thyroid hormone conversion (T4 to T3) and glutathione peroxidase activity — Brazil nuts are the richest food source.',
        'Iodine is required for thyroid hormone synthesis; deficiency causes goiter and, during pregnancy, cretinism — the most common preventable cause of intellectual disability.',
        'Mineral interactions are clinically significant: zinc and copper compete for absorption, iron and calcium inhibit each other, and selenium and iodine work synergistically for thyroid health.'
      ]),
      content_html: `
<h2>Trace Minerals &amp; Electrolytes</h2>

<h3>Overview</h3>
<p>Trace minerals (microminerals) are required in quantities less than 100 mg per day, but their roles in health are no less critical. They serve as enzyme cofactors, structural components of proteins, and regulators of gene expression and immune function. Deficiencies in trace minerals are widespread globally and have significant clinical consequences.</p>

<h3>Iron (Fe)</h3>
<p>Iron is essential for <strong>oxygen transport</strong> (as a component of hemoglobin in red blood cells and myoglobin in muscle cells), energy production (component of cytochromes in the electron transport chain), DNA synthesis, and immune function. Iron exists in two dietary forms:</p>
<ul>
  <li><strong>Heme iron:</strong> Found in animal tissues (red meat, poultry, fish). Absorbed at approximately 15-35% efficiency, largely unaffected by other dietary factors.</li>
  <li><strong>Non-heme iron:</strong> Found in plant foods (spinach, legumes, fortified cereals, tofu) and constitutes about 85-90% of dietary iron intake. Absorbed at only 2-20% efficiency. Absorption is significantly <strong>enhanced</strong> by vitamin C, organic acids, and cooking in cast iron, and <strong>inhibited</strong> by calcium, phytates (in grains and legumes), polyphenols/tannins (in tea and coffee), and oxalates.</li>
</ul>

<p><strong>Iron deficiency</strong> is the most common nutritional deficiency worldwide, affecting an estimated 2 billion people. It progresses through three stages: (1) depleted iron stores (low ferritin), (2) iron-deficient erythropoiesis (low serum iron, high TIBC), and (3) iron deficiency anemia (low hemoglobin, microcytic hypochromic red blood cells). Symptoms include fatigue, pallor, shortness of breath, cold extremities, brittle nails (koilonychia/spoon nails), pica (craving non-food items like ice or dirt), and restless leg syndrome.</p>

<div class="callout"><strong>Clinical Note:</strong> When recommending iron supplementation, advise clients to take it with vitamin C (e.g., orange juice) and away from calcium supplements, dairy, tea, and coffee by at least 2 hours. Iron bisglycinate is generally better tolerated than ferrous sulfate, with fewer GI side effects (constipation, nausea). Always assess for root causes of iron deficiency — particularly heavy menstruation, GI bleeding, or poor absorption — rather than simply supplementing.</div>

<h3>Zinc (Zn)</h3>
<p>Zinc is a cofactor for over <strong>300 enzymes</strong> and is involved in immune function (T-cell development, natural killer cell activity), wound healing, protein synthesis, DNA synthesis, cell division, taste and smell perception, and insulin storage and secretion. Zinc also functions as an antioxidant by protecting sulfhydryl groups and inducing metallothionein synthesis.</p>

<p><strong>Food sources:</strong> Oysters (the richest source), red meat, poultry, crab, lobster, pumpkin seeds, chickpeas, cashews, and fortified cereals. Plant-based zinc sources are less bioavailable due to phytate binding.</p>

<p><strong>Deficiency signs:</strong> Impaired immunity (frequent infections), delayed wound healing, loss of taste and smell, skin lesions, hair loss, diarrhea, and in children, growth retardation. Zinc deficiency is common in vegetarians/vegans, pregnant women, older adults, and those with GI conditions affecting absorption.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Know the zinc-copper interaction: high-dose zinc supplementation (above 40 mg/day long-term) can induce copper deficiency by upregulating metallothionein in enterocytes, which preferentially binds copper and prevents its absorption. When supplementing zinc therapeutically, consider adding a small amount of copper (2 mg per 15 mg zinc is a common ratio).</div>

<h3>Selenium (Se)</h3>
<p>Selenium is essential for <strong>thyroid hormone metabolism</strong> (the selenoprotein deiodinase enzymes convert inactive T4 to active T3), antioxidant defense (as a component of glutathione peroxidase enzymes), and immune function. The thyroid gland contains the highest concentration of selenium per gram of any tissue in the body.</p>

<p><strong>Food sources:</strong> Brazil nuts are exceptionally rich (1-2 nuts provide the daily requirement), followed by seafood, organ meats, eggs, sunflower seeds, and mushrooms. Soil selenium content varies dramatically by region, affecting food levels.</p>

<p>Deficiency is associated with Keshan disease (cardiomyopathy), Kashin-Beck disease (osteoarthropathy), impaired thyroid function, weakened immunity, and increased oxidative stress. Both deficiency and excess (selenosis) are harmful — the therapeutic window is narrow. Selenosis symptoms include garlic breath odor, brittle nails, hair loss, and GI disturbances.</p>

<h3>Iodine (I)</h3>
<p>Iodine is required exclusively for the synthesis of <strong>thyroid hormones</strong> (T3 and T4), which regulate basal metabolic rate, growth, development, and body temperature. The thyroid gland actively concentrates iodine from the bloodstream against a concentration gradient.</p>

<p>Deficiency causes goiter (enlarged thyroid), hypothyroidism, and during pregnancy, cretinism (severe intellectual disability and developmental delays in the infant). Iodine deficiency remains the most common preventable cause of intellectual disability worldwide. Food sources include iodized salt, seaweed (particularly kelp — caution with excessive intake), fish, dairy, and eggs.</p>

<h3>Chromium (Cr), Copper (Cu), and Manganese (Mn)</h3>
<p><strong>Chromium</strong> enhances insulin sensitivity by potentiating insulin receptor activity. It supports glucose tolerance and may benefit clients with insulin resistance or type 2 diabetes. Found in broccoli, grape juice, whole grains, and brewer's yeast.</p>

<p><strong>Copper</strong> is essential for iron metabolism (ceruloplasmin oxidizes ferrous to ferric iron for transport), connective tissue formation (lysyl oxidase for collagen and elastin cross-linking), energy production (cytochrome c oxidase), and antioxidant defense (superoxide dismutase). Found in liver, oysters, dark chocolate, nuts, and seeds. Copper and zinc compete for absorption — maintaining the 10:1 to 15:1 zinc-to-copper ratio is clinically important.</p>

<p><strong>Manganese</strong> is a cofactor for manganese superoxide dismutase (MnSOD, a mitochondrial antioxidant enzyme), enzymes in bone formation, and carbohydrate metabolism. Found in whole grains, nuts, leafy greens, and tea. Deficiency is rare from diet alone.</p>

<div class="callout"><strong>Clinical Note:</strong> For thyroid health, ensure adequate intake of both selenium and iodine. Selenium protects the thyroid from oxidative damage (generated during hormone synthesis) and is required for T4-to-T3 conversion. Supplementing iodine without adequate selenium in the context of autoimmune thyroiditis (Hashimoto's) may worsen thyroid inflammation. A comprehensive thyroid support protocol addresses both minerals along with zinc, iron, and vitamin D.</div>
`
    },

    // ── Module 3: Functional Foods & Bioactive Compounds ────────
    {
      module_id: moduleIdMap['1-3'],
      lesson_order: 1,
      title: 'Antioxidants & Free Radicals',
      subtitle: 'Oxidative stress, antioxidant defense systems, and clinical strategies',
      estimated_minutes: 16,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Free radicals are unstable molecules with unpaired electrons that damage cells through oxidative stress; they are produced by normal metabolism and increased by toxins, stress, and inflammation.',
        'The body has endogenous antioxidant systems — superoxide dismutase (SOD), catalase, and glutathione peroxidase — that require mineral cofactors (Zn, Cu, Mn, Se).',
        'Dietary antioxidants include vitamins C and E, carotenoids, polyphenols, and flavonoids — they work synergistically in a network.',
        'The ORAC scale measures antioxidant capacity but has limitations; a varied diet of colorful whole foods is the best strategy.',
        'Excessive supplementation with isolated antioxidants can paradoxically become pro-oxidant — food-based antioxidants are preferred.'
      ]),
      content_html: `
<h2>Antioxidants &amp; Free Radicals</h2>

<h3>Understanding Free Radicals and Oxidative Stress</h3>
<p>A <strong>free radical</strong> is any atom or molecule that contains one or more unpaired electrons in its outer shell, making it highly reactive and unstable. To achieve stability, free radicals "steal" electrons from nearby molecules — lipids in cell membranes, proteins, and even DNA — creating a chain reaction of molecular damage called <strong>oxidative stress</strong>.</p>

<p>Free radicals are produced naturally through normal metabolic processes, including mitochondrial respiration (the electron transport chain "leaks" approximately 1-3% of electrons to form superoxide radicals), immune defense (phagocytes produce reactive oxygen species to kill pathogens), detoxification (cytochrome P450 enzymes in the liver), and exercise. External sources that dramatically increase free radical production include cigarette smoke, air pollution, UV radiation, pesticides and environmental toxins, heavy metals, chronic psychological stress, excessive alcohol, and fried or charred foods.</p>

<p>When free radical production overwhelms the body's antioxidant defenses, the resulting <strong>oxidative stress</strong> contributes to cellular aging, DNA mutations (increasing cancer risk), lipid peroxidation (contributing to atherosclerosis), protein oxidation (impairing enzyme function), and neurodegeneration. Oxidative stress is implicated in virtually every chronic disease, including cardiovascular disease, cancer, diabetes, Alzheimer's disease, Parkinson's disease, and autoimmune conditions.</p>

<h3>Endogenous Antioxidant Defense Systems</h3>
<p>The body possesses powerful built-in antioxidant enzyme systems:</p>
<ul>
  <li><strong>Superoxide dismutase (SOD):</strong> Converts superoxide radicals to hydrogen peroxide. Exists in three forms: CuZn-SOD (cytoplasm, requires copper and zinc), Mn-SOD (mitochondria, requires manganese), and EC-SOD (extracellular, requires copper and zinc).</li>
  <li><strong>Catalase:</strong> Converts hydrogen peroxide to water and oxygen. Requires iron as a cofactor. Highly concentrated in the liver and red blood cells.</li>
  <li><strong>Glutathione peroxidase (GPx):</strong> Reduces hydrogen peroxide and lipid hydroperoxides using glutathione as a substrate. Requires selenium as a cofactor. This system is considered the body's most important intracellular antioxidant defense.</li>
</ul>

<p><strong>Glutathione (GSH)</strong> is often called the body's "master antioxidant." This tripeptide (glutamate, cysteine, glycine) is produced in every cell and is critical for neutralizing free radicals, regenerating other antioxidants (vitamins C and E), supporting detoxification (phase II liver conjugation), and regulating immune function. Glutathione levels decline with age, chronic illness, toxin exposure, and poor nutrition. Cysteine is the rate-limiting amino acid for glutathione synthesis — N-acetyl cysteine (NAC) and whey protein are effective precursors.</p>

<div class="callout"><strong>Clinical Note:</strong> Supporting endogenous antioxidant production is often more effective than high-dose antioxidant supplementation. Key strategies include ensuring adequate intake of cofactor minerals (selenium, zinc, copper, manganese, iron), providing glutathione precursors (NAC, glycine, glutamine), consuming sulfur-rich cruciferous vegetables (which upregulate the Nrf2 pathway and endogenous antioxidant gene expression), and reducing excessive oxidative stress exposures.</div>

<h3>Dietary Antioxidants</h3>
<p>Exogenous (dietary) antioxidants complement the endogenous systems and include:</p>
<ul>
  <li><strong>Vitamin C:</strong> The primary water-soluble antioxidant. Scavenges free radicals in aqueous environments and regenerates oxidized vitamin E.</li>
  <li><strong>Vitamin E:</strong> The primary fat-soluble antioxidant. Protects PUFA-rich cell membranes from lipid peroxidation.</li>
  <li><strong>Carotenoids:</strong> Beta-carotene, lycopene, lutein, zeaxanthin, and astaxanthin. Quench singlet oxygen and scavenge peroxyl radicals. Lycopene (tomatoes) and astaxanthin (salmon, krill) are particularly potent.</li>
  <li><strong>Polyphenols:</strong> A vast class of plant compounds including flavonoids, phenolic acids, stilbenes (resveratrol), and lignans. Found abundantly in berries, tea, coffee, dark chocolate, red wine, olive oil, and spices.</li>
  <li><strong>Coenzyme Q10 (CoQ10):</strong> A fat-soluble antioxidant produced endogenously and found in organ meats, sardines, and peanuts. Essential for mitochondrial energy production and declines with age and statin use.</li>
  <li><strong>Alpha-lipoic acid (ALA):</strong> Unique in being both water- and fat-soluble, allowing it to function in all cellular compartments. Regenerates vitamins C, E, and glutathione. Found in organ meats, spinach, and broccoli.</li>
</ul>

<div class="exam-tip"><strong>Exam Tip:</strong> Understand the concept of the "antioxidant network" — antioxidants work synergistically, recycling each other. Vitamin C regenerates vitamin E, alpha-lipoic acid regenerates both C and E plus glutathione. Know the mineral cofactors for each endogenous enzyme (SOD: Zn/Cu/Mn; catalase: Fe; GPx: Se). The exam may present clinical scenarios asking you to identify which antioxidant system is compromised based on mineral deficiency.</div>

<h3>The Paradox of Antioxidant Supplementation</h3>
<p>While dietary antioxidants from whole foods consistently show health benefits, high-dose isolated antioxidant supplements have produced mixed or even harmful results in clinical trials. Isolated beta-carotene supplementation increased lung cancer risk in smokers. High-dose vitamin E showed no cardiovascular benefit and potential risks at doses above 400 IU. The explanation lies in the fact that antioxidants can become <strong>pro-oxidant</strong> at high concentrations or in isolation, and that the health benefits of antioxidant-rich foods come from the complex synergy of hundreds of compounds working together — not any single isolated nutrient. The best clinical recommendation remains a varied diet rich in colorful fruits, vegetables, herbs, and spices.</p>
`
    },

    {
      module_id: moduleIdMap['1-3'],
      lesson_order: 2,
      title: 'Phytonutrients & Plant Compounds',
      subtitle: 'Polyphenols, carotenoids, glucosinolates, and their therapeutic applications',
      estimated_minutes: 16,
      exam_alert: false,
      key_takeaways: JSON.stringify([
        'Phytonutrients are bioactive plant compounds that provide health benefits beyond basic nutrition — over 25,000 have been identified.',
        'Major categories include polyphenols (flavonoids, phenolic acids, stilbenes), carotenoids, glucosinolates, and organosulfur compounds.',
        'The "eat the rainbow" principle ensures a broad spectrum of phytonutrients — each color group provides different bioactive compounds.',
        'Cruciferous vegetables contain glucosinolates that are converted to sulforaphane and indole-3-carbinol, which support detoxification and estrogen metabolism.',
        'Bioavailability of phytonutrients is affected by cooking method, food matrix, fat co-ingestion, and gut microbiome composition.'
      ]),
      content_html: `
<h2>Phytonutrients &amp; Plant Compounds</h2>

<h3>What Are Phytonutrients?</h3>
<p><strong>Phytonutrients</strong> (also called phytochemicals) are bioactive compounds produced by plants as part of their defense mechanisms against UV radiation, pathogens, insects, and environmental stress. While not classified as essential nutrients (no deficiency disease results from their absence), they exert profound effects on human health, including antioxidant activity, anti-inflammatory signaling, hormone modulation, detoxification support, immune enhancement, and anticancer properties. Over 25,000 phytonutrients have been identified, and research continues to reveal new compounds and mechanisms.</p>

<h3>Polyphenols</h3>
<p>Polyphenols are the largest and most studied class of phytonutrients, characterized by multiple phenol ring structures. They are subdivided into several groups:</p>

<p><strong>Flavonoids</strong> (the largest subclass, with over 6,000 identified):</p>
<ul>
  <li><strong>Flavonols:</strong> Quercetin (onions, apples, berries, capers) — a potent anti-inflammatory, antihistamine, and antiviral compound. Stabilizes mast cells and inhibits histamine release.</li>
  <li><strong>Flavanols (catechins):</strong> EGCG in green tea — supports metabolism, antioxidant defense, and has anticancer properties.</li>
  <li><strong>Anthocyanins:</strong> The blue, purple, and red pigments in blueberries, blackberries, purple cabbage, and cherries. Support cardiovascular health, cognitive function, and reduce oxidative stress.</li>
  <li><strong>Isoflavones:</strong> Genistein and daidzein in soy products. Phytoestrogenic compounds that bind estrogen receptors with weaker activity than endogenous estrogen. May modulate estrogen-related conditions.</li>
  <li><strong>Flavanones:</strong> Hesperidin and naringenin in citrus fruits. Support vascular health and have anti-inflammatory effects.</li>
</ul>

<p><strong>Phenolic acids:</strong> Include chlorogenic acid (coffee, green coffee bean extract — supports blood sugar regulation), ellagic acid (pomegranates, berries, walnuts — anticancer and antioxidant), and rosmarinic acid (rosemary, oregano, basil — anti-inflammatory and neuroprotective).</p>

<p><strong>Stilbenes:</strong> Resveratrol is the most notable, found in red grape skins, red wine, peanuts, and Japanese knotweed. Activates sirtuins (longevity-associated proteins), has cardioprotective and anti-inflammatory effects. Bioavailability is low but enhanced by co-consumption with piperine (black pepper) or fat.</p>

<div class="callout"><strong>Clinical Note:</strong> Quercetin is particularly valuable in holistic practice for clients with allergies, histamine intolerance, and chronic inflammation. It stabilizes mast cells and inhibits histamine release without the drowsiness of pharmaceutical antihistamines. A typical therapeutic dose is 500-1000 mg daily, often combined with vitamin C and bromelain for enhanced absorption. It also has antiviral properties and supports immune defense.</div>

<h3>Carotenoids</h3>
<p>Carotenoids are lipophilic pigments responsible for red, orange, and yellow colors in plants. Key carotenoids include beta-carotene (provitamin A, in carrots, sweet potatoes), lycopene (tomatoes, watermelon, pink grapefruit — no provitamin A activity but the most potent singlet oxygen quencher among carotenoids), lutein and zeaxanthin (dark leafy greens, egg yolks — accumulate in the macula of the eye and protect against age-related macular degeneration), and astaxanthin (salmon, shrimp, microalgae — 6,000 times more potent than vitamin C as an antioxidant). Carotenoid absorption is significantly enhanced by dietary fat — cooking tomatoes in olive oil, for example, dramatically increases lycopene bioavailability.</p>

<h3>Glucosinolates and Cruciferous Compounds</h3>
<p>Cruciferous vegetables (broccoli, cauliflower, kale, Brussels sprouts, cabbage, arugula, watercress) contain <strong>glucosinolates</strong> that, when plant cells are damaged by chopping or chewing, are converted by the enzyme myrosinase to biologically active compounds:</p>
<ul>
  <li><strong>Sulforaphane:</strong> The most potent activator of the Nrf2 pathway, which upregulates production of phase II detoxification enzymes and endogenous antioxidants (glutathione, SOD, catalase). Broccoli sprouts contain 20-100 times more sulforaphane precursor than mature broccoli.</li>
  <li><strong>Indole-3-carbinol (I3C) and DIM (diindolylmethane):</strong> Support estrogen metabolism by promoting the 2-hydroxy estrogen pathway (protective) over the 16-hydroxy and 4-hydroxy pathways (potentially harmful). Clinically relevant for estrogen-dominant conditions.</li>
</ul>

<p>Cooking inactivates myrosinase, so raw or lightly steamed preparations maximize sulforaphane production. Adding mustard seed powder (which contains heat-stable myrosinase) to cooked cruciferous vegetables can restore conversion.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Know the key phytonutrient categories, representative compounds, and their food sources. The "eat the rainbow" principle is a testable concept: red (lycopene), orange (beta-carotene), yellow (lutein), green (sulforaphane, chlorophyll), blue/purple (anthocyanins), white (allicin from garlic, quercetin from onions). Also know that sulforaphane activates the Nrf2 pathway for detoxification support.</div>

<h3>Organosulfur Compounds</h3>
<p>Allium vegetables (garlic, onions, leeks, shallots) contain organosulfur compounds such as <strong>allicin</strong> (formed when garlic is crushed and alliin meets the enzyme alliinase). Allicin has antimicrobial, antiviral, antifungal, and cardiovascular protective properties. Crushing garlic and letting it sit for 10 minutes before cooking maximizes allicin formation. Other organosulfur compounds in garlic support detoxification, reduce blood pressure, and improve lipid profiles.</p>
`
    },

    {
      module_id: moduleIdMap['1-3'],
      lesson_order: 3,
      title: 'Probiotics, Prebiotics & Fermented Foods',
      subtitle: 'The gut microbiome, beneficial bacteria, and fermentation science',
      estimated_minutes: 17,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'The gut microbiome contains trillions of organisms that influence digestion, immunity, mood, metabolism, and disease risk.',
        'Probiotics are live beneficial microorganisms; key strains include Lactobacillus, Bifidobacterium, and Saccharomyces boulardii — strain specificity matters for clinical outcomes.',
        'Prebiotics are non-digestible fibers that selectively feed beneficial bacteria — FOS, GOS, inulin, and resistant starch are the most studied.',
        'Fermented foods (yogurt, kefir, sauerkraut, kimchi, miso, kombucha) provide both probiotics and bioavailable nutrients.',
        'Dysbiosis (microbial imbalance) is linked to IBS, IBD, autoimmune disease, obesity, mental health disorders, and skin conditions.'
      ]),
      content_html: `
<h2>Probiotics, Prebiotics &amp; Fermented Foods</h2>

<h3>The Gut Microbiome</h3>
<p>The human gut harbors approximately <strong>38 trillion microorganisms</strong> — bacteria, fungi, viruses, and archaea — collectively known as the gut microbiome. This microbial ecosystem, weighing approximately 2-3 pounds, functions as a virtual organ, influencing digestion and nutrient absorption, immune system development and regulation (70-80% of immune tissue resides in the gut), synthesis of vitamins (K2, B12, biotin, folate), neurotransmitter production (95% of serotonin is produced in the gut), metabolism and weight regulation, detoxification, and the integrity of the intestinal barrier.</p>

<p>A healthy microbiome is characterized by <strong>high diversity</strong> — a wide variety of beneficial species in balanced proportions. <strong>Dysbiosis</strong> — an imbalance characterized by reduced diversity, overgrowth of pathogenic species, or loss of beneficial species — is associated with irritable bowel syndrome, inflammatory bowel disease, colorectal cancer, obesity and metabolic syndrome, autoimmune conditions, mental health disorders (the gut-brain axis), allergies, eczema, and systemic inflammation.</p>

<p>Factors that damage microbiome diversity include antibiotic use (even a single course can reduce diversity for up to a year), a processed food diet low in fiber, chronic stress, environmental toxins, caesarean birth and formula feeding (affecting initial colonization), excessive hygiene, and certain medications (PPIs, NSAIDs, oral contraceptives).</p>

<h3>Probiotics</h3>
<p>Probiotics are defined as <strong>live microorganisms that, when administered in adequate amounts, confer a health benefit on the host</strong> (WHO definition). The most well-studied probiotic genera include:</p>
<ul>
  <li><strong>Lactobacillus:</strong> L. acidophilus (supports vaginal and urinary health), L. rhamnosus GG (one of the most researched strains, supports immune function and antibiotic-associated diarrhea prevention), L. plantarum (supports gut barrier function and reduces bloating).</li>
  <li><strong>Bifidobacterium:</strong> B. longum (reduces inflammation and supports immune regulation), B. lactis (enhances immune response in the elderly), B. infantis (particularly beneficial for IBS and is the dominant species in breastfed infant microbiomes).</li>
  <li><strong>Saccharomyces boulardii:</strong> A beneficial yeast (not a bacterium) that is resistant to antibiotics and particularly effective for preventing and treating antibiotic-associated diarrhea, Clostridium difficile infection, and traveler's diarrhea.</li>
</ul>

<div class="callout"><strong>Clinical Note:</strong> Probiotic recommendations should be strain-specific, not generic. Different strains have different clinical evidence. For antibiotic-associated diarrhea: S. boulardii or L. rhamnosus GG. For IBS: B. infantis 35624 or multi-strain formulas. For immune support: L. rhamnosus GG or L. paracasei. For vaginal health: L. rhamnosus GR-1 and L. reuteri RC-14. Always recommend probiotics be taken during and for at least 2 weeks after antibiotic therapy — timing them at least 2 hours apart from the antibiotic dose.</div>

<h3>Prebiotics</h3>
<p><strong>Prebiotics</strong> are non-digestible food components that selectively stimulate the growth and activity of beneficial gut bacteria. They are essentially "food for the good bugs." Key prebiotics include:</p>
<ul>
  <li><strong>Fructooligosaccharides (FOS) and inulin:</strong> Found in chicory root, garlic, onions, leeks, asparagus, bananas, and Jerusalem artichokes. Preferentially feed Bifidobacteria.</li>
  <li><strong>Galactooligosaccharides (GOS):</strong> Found in legumes and human breast milk. Support both Bifidobacteria and Lactobacilli.</li>
  <li><strong>Resistant starch:</strong> Found in cooked and cooled rice, potatoes, green bananas, and legumes. Fermented to produce butyrate, the primary fuel for colonocytes.</li>
  <li><strong>Pectin:</strong> Found in apples, citrus fruits, and berries. A gentle prebiotic that supports microbial diversity.</li>
  <li><strong>Polyphenols:</strong> Compounds in berries, green tea, cocoa, and olive oil also act as prebiotics, selectively promoting beneficial species like Akkermansia muciniphila.</li>
</ul>

<h3>Fermented Foods</h3>
<p>Fermented foods undergo a process in which microorganisms (bacteria, yeasts) convert sugars and starches into organic acids, alcohol, or gases. This process increases nutrient bioavailability, produces beneficial enzymes and vitamins, and creates probiotic cultures. Key fermented foods include:</p>
<ul>
  <li><strong>Yogurt and kefir:</strong> Fermented dairy containing Lactobacillus and Bifidobacterium species. Kefir contains a wider variety of beneficial organisms (up to 61 strains) than yogurt.</li>
  <li><strong>Sauerkraut and kimchi:</strong> Fermented vegetables rich in Lactobacillus species, vitamins C and K, and enzymes. Must be raw/unpasteurized to contain live cultures.</li>
  <li><strong>Miso and tempeh:</strong> Fermented soy products. Miso contains beneficial Aspergillus oryzae; tempeh is fermented by Rhizopus oligosporus, increasing protein digestibility and producing vitamin K2.</li>
  <li><strong>Kombucha:</strong> Fermented tea containing a SCOBY (symbiotic culture of bacteria and yeast). Provides organic acids, B vitamins, and beneficial organisms. May contain trace alcohol and sugar depending on fermentation length.</li>
</ul>

<div class="exam-tip"><strong>Exam Tip:</strong> Distinguish between probiotics (live organisms), prebiotics (food for beneficial organisms), and postbiotics (beneficial metabolic byproducts like SCFAs). Know specific strain recommendations for common conditions. Remember that fermented foods must be raw/unpasteurized to contain live cultures — pasteurized sauerkraut or pickles do not provide probiotics. The exam may test your understanding of dysbiosis causes and the gut-brain axis connection.</div>
`
    },

    {
      module_id: moduleIdMap['1-3'],
      lesson_order: 4,
      title: 'Culinary & Medicinal Herbs',
      subtitle: 'Traditional uses, active compounds, and evidence-based herbal therapeutics',
      estimated_minutes: 15,
      exam_alert: false,
      key_takeaways: JSON.stringify([
        'Culinary herbs and spices contain concentrated bioactive compounds with therapeutic properties — turmeric (curcumin), ginger (gingerols), cinnamon (cinnamaldehyde), and garlic (allicin) are the most studied.',
        'Adaptogenic herbs (ashwagandha, rhodiola, holy basil) help modulate the stress response by supporting HPA axis balance.',
        'Herb-drug interactions are a critical safety concern — St. John\'s Wort, ginkgo, and garlic are among the most interactive herbs.',
        'Quality, preparation method, and standardization significantly affect herbal potency and clinical outcomes.',
        'Holistic nutrition consultants should understand herbal basics but recognize when to refer to a qualified herbalist for complex protocols.'
      ]),
      content_html: `
<h2>Culinary &amp; Medicinal Herbs</h2>

<h3>Herbs as Functional Foods</h3>
<p>Culinary herbs and spices have been used for millennia across every culture as both food and medicine. Modern research has validated many traditional uses, identifying specific bioactive compounds responsible for their therapeutic effects. For holistic nutrition consultants, understanding the major culinary and medicinal herbs allows integration of gentle, food-based therapeutic strategies into client protocols.</p>

<h3>Key Culinary Herbs and Spices</h3>
<p><strong>Turmeric (Curcuma longa):</strong> The active compound curcumin is one of the most researched natural anti-inflammatory agents. It inhibits NF-kB (a master inflammatory transcription factor), reduces pro-inflammatory cytokines (TNF-alpha, IL-1, IL-6), and has antioxidant, anticancer, and neuroprotective properties. Curcumin has poor oral bioavailability alone — combining with piperine from black pepper increases absorption by approximately 2,000%, and consuming with dietary fat further enhances uptake.</p>

<p><strong>Ginger (Zingiber officinale):</strong> Contains gingerols and shogaols with anti-inflammatory, antiemetic (anti-nausea), and digestive support properties. Clinically validated for nausea associated with pregnancy (morning sickness), motion sickness, and chemotherapy. Also supports gastric motility, reduces gas and bloating, and has mild blood-thinning properties. Fresh ginger is higher in gingerols; dried ginger is higher in shogaols (more pungent and potent).</p>

<p><strong>Cinnamon (Cinnamomum verum/cassia):</strong> Cinnamaldehyde, the primary active compound, supports blood sugar regulation by improving insulin sensitivity, slowing gastric emptying, and inhibiting digestive enzymes that break down carbohydrates. Ceylon cinnamon (C. verum) is preferred over cassia cinnamon due to lower coumarin content — high coumarin intake can be hepatotoxic with long-term use.</p>

<p><strong>Garlic (Allium sativum):</strong> As discussed in phytonutrients, allicin and other organosulfur compounds provide antimicrobial, cardiovascular, and immune-supportive effects. Aged garlic extract (AGE) has additional research support for blood pressure reduction, cholesterol improvement, and immune enhancement. Garlic can potentiate anticoagulant medications — a key safety consideration.</p>

<p><strong>Rosemary (Rosmarinus officinalis):</strong> Contains carnosic acid and rosmarinic acid, both potent antioxidants. Supports cognitive function and memory, protects meat from carcinogenic heterocyclic amine formation during grilling, and has antimicrobial properties. The aroma alone has been shown to improve alertness and memory in aromatherapy studies.</p>

<h3>Adaptogenic Herbs</h3>
<p><strong>Adaptogens</strong> are a class of herbs that help the body adapt to physical, chemical, and biological stressors by modulating the hypothalamic-pituitary-adrenal (HPA) axis and cortisol response. To be classified as an adaptogen, an herb must be non-toxic at normal doses, produce a nonspecific adaptive response (increasing resistance to multiple stressors), and have a normalizing effect (bringing the body toward homeostasis regardless of the direction of deviation).</p>

<ul>
  <li><strong>Ashwagandha (Withania somnifera):</strong> One of the most well-studied adaptogens. Reduces cortisol levels, supports thyroid function (may increase T4 production), improves anxiety and sleep quality, and enhances physical performance. The root extract standardized to withanolides (KSM-66 or Sensoril) has the strongest clinical evidence.</li>
  <li><strong>Rhodiola (Rhodiola rosea):</strong> Supports mental performance, reduces fatigue, and improves stress resilience. Acts on serotonin and dopamine pathways. Best taken in the morning due to mildly stimulating effects.</li>
  <li><strong>Holy Basil / Tulsi (Ocimum sanctum):</strong> An Ayurvedic adaptogen that reduces cortisol, supports blood sugar regulation, and has anti-anxiety properties. Commonly consumed as a tea.</li>
</ul>

<div class="callout"><strong>Clinical Note:</strong> When introducing herbs into client protocols, start with culinary doses and food-based preparations before moving to therapeutic supplementation. Be aware of herb-drug interactions: St. John's Wort induces cytochrome P450 enzymes and can reduce the effectiveness of oral contraceptives, anticoagulants, antidepressants, and many other medications. Garlic, ginger, ginkgo, and turmeric have blood-thinning properties and should be used cautiously with anticoagulant therapy. Always ask clients about all supplements and medications during intake.</div>

<h3>Digestive Herbs</h3>
<p>Several herbs specifically support digestive function: <strong>peppermint</strong> relaxes smooth muscle and relieves IBS symptoms (enteric-coated capsules bypass the stomach to act on the intestines); <strong>fennel</strong> reduces gas, bloating, and intestinal cramping; <strong>chamomile</strong> soothes inflammation of the GI mucosa and has gentle anti-spasmodic effects; <strong>gentian root</strong> and <strong>dandelion</strong> are bitter herbs that stimulate digestive secretions (stomach acid, bile, and pancreatic enzymes) when consumed 15-20 minutes before meals.</p>

<p>The concept of <strong>digestive bitters</strong> — using bitter-tasting herbs to stimulate the cephalic phase of digestion via bitter taste receptors on the tongue — is a foundational practice in traditional Western herbalism, Ayurveda, and Traditional Chinese Medicine. Modern research confirms that bitter taste receptors (T2Rs) exist not only on the tongue but throughout the GI tract, where they stimulate secretion of digestive hormones including gastrin, cholecystokinin, and ghrelin.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Know the major herb-drug interactions, especially St. John's Wort and CYP450 enzyme induction. Understand the adaptogen definition and be able to identify the three major adaptogens (ashwagandha, rhodiola, holy basil). The concept of digestive bitters and their mechanism of action through bitter taste receptors is a recurring exam topic in the holistic nutrition context.</div>
`
    },

    // ── Module 4: Food Quality & Safety ─────────────────────────
    {
      module_id: moduleIdMap['1-4'],
      lesson_order: 1,
      title: 'Whole vs Processed Foods',
      subtitle: 'Food processing continuum, nutrient density, and the impact of ultra-processing',
      estimated_minutes: 14,
      exam_alert: false,
      key_takeaways: JSON.stringify([
        'The NOVA classification system categorizes foods into 4 groups: unprocessed/minimally processed, processed culinary ingredients, processed foods, and ultra-processed foods.',
        'Ultra-processed foods (UPFs) are associated with obesity, metabolic syndrome, cardiovascular disease, cancer, depression, and all-cause mortality.',
        'Nutrient density — the ratio of micronutrients to calories — is a key concept for evaluating food quality and guiding client recommendations.',
        'Processing removes fiber, vitamins, minerals, and phytonutrients while adding sugar, refined oils, sodium, and artificial additives.',
        'A whole-foods-based diet centered on vegetables, fruits, whole grains, legumes, nuts, seeds, and quality animal products is foundational to holistic nutrition practice.'
      ]),
      content_html: `
<h2>Whole vs. Processed Foods</h2>

<h3>Defining the Processing Spectrum</h3>
<p>Not all food processing is harmful. Cooking, fermenting, freezing, and drying are forms of processing that can enhance nutritional value, food safety, and accessibility. The critical distinction lies in the <strong>degree and purpose of processing</strong>. The NOVA classification system, developed by researchers at the University of Sao Paulo, provides a framework for categorizing foods by their level of processing:</p>

<ul>
  <li><strong>Group 1 — Unprocessed or minimally processed foods:</strong> Fresh fruits and vegetables, nuts, seeds, eggs, fresh meat and fish, whole grains, legumes, herbs, spices, water, milk, and plain yogurt. Minimally processed operations (washing, peeling, fermenting, pasteurizing, freezing) do not fundamentally alter the food.</li>
  <li><strong>Group 2 — Processed culinary ingredients:</strong> Oils (olive oil, butter, coconut oil), salt, sugar, honey, vinegar, and flour. These are extracted and purified from Group 1 foods and used in food preparation.</li>
  <li><strong>Group 3 — Processed foods:</strong> Products made by combining Group 1 and Group 2 foods using simple methods (canning, bottling, curing). Examples include canned vegetables, artisan bread, cheese, cured meats, and salted nuts. These generally retain the original food identity and have limited ingredient lists.</li>
  <li><strong>Group 4 — Ultra-processed foods (UPFs):</strong> Industrial formulations made predominantly from substances derived from foods and additives, with little or no intact Group 1 food remaining. Characterized by long ingredient lists featuring substances not found in home kitchens: high-fructose corn syrup, hydrogenated oils, protein isolates, artificial colors and flavors, emulsifiers, humectants, and preservatives. Examples include soft drinks, packaged snacks, fast food, instant noodles, reconstituted meat products, and most breakfast cereals.</li>
</ul>

<h3>The Health Impact of Ultra-Processed Foods</h3>
<p>Research consistently links high UPF consumption to adverse health outcomes. A systematic review and meta-analysis found that increased UPF intake is associated with significantly increased risk of obesity, type 2 diabetes, cardiovascular disease, colorectal cancer, depression and anxiety, all-cause mortality, and metabolic syndrome. UPFs currently constitute approximately 57-60% of calories in the average American diet.</p>

<p>Multiple mechanisms explain the harm of ultra-processing:</p>
<ul>
  <li><strong>Nutrient displacement:</strong> UPFs provide calories with minimal vitamins, minerals, fiber, or phytonutrients, displacing nutrient-dense whole foods from the diet.</li>
  <li><strong>Hyperpalatability engineering:</strong> The precise combination of sugar, fat, salt, and texture is designed to override satiety signals, promoting overconsumption.</li>
  <li><strong>Additives:</strong> Emulsifiers (carboxymethylcellulose, polysorbate 80) have been shown in animal studies to disrupt the gut mucosal barrier and promote intestinal inflammation and dysbiosis. Artificial sweeteners alter gut microbiome composition. Artificial colors are linked to behavioral issues in children.</li>
  <li><strong>Advanced glycation end-products (AGEs):</strong> Formed during high-heat industrial processing, AGEs promote oxidative stress, inflammation, and accelerated aging.</li>
</ul>

<div class="callout"><strong>Clinical Note:</strong> When counseling clients to reduce processed food intake, take a gradual, non-judgmental approach. Rather than focusing on restriction, emphasize crowding out UPFs with appealing whole food alternatives. Help clients read ingredient labels — if the list contains more than 5 ingredients or includes substances they would not use in their own kitchen, the product is likely ultra-processed. Teach the concept of nutrient density as a positive framework for food choices.</div>

<h3>Nutrient Density</h3>
<p><strong>Nutrient density</strong> refers to the concentration of vitamins, minerals, fiber, and other beneficial compounds per calorie of food. Nutrient-dense foods provide substantial nutrition for relatively few calories, while "empty calorie" foods provide energy with little nutritional value. The most nutrient-dense foods include organ meats (especially liver), dark leafy greens, shellfish, sardines, berries, cruciferous vegetables, eggs, and legumes.</p>

<p>The Aggregate Nutrient Density Index (ANDI) developed by Joel Fuhrman, MD, scores foods based on their micronutrient content per calorie. Kale, watercress, and collard greens top the list. While no single scoring system is perfect, the concept of nutrient density provides a useful clinical tool for helping clients prioritize food quality.</p>

<h3>Practical Recommendations</h3>
<p>Holistic nutrition practitioners should guide clients toward a diet centered on whole, minimally processed foods while recognizing that some degree of processing is both practical and acceptable. The goal is not perfection but rather a significant shift in the ratio of whole to ultra-processed foods. Key strategies include shopping the perimeter of the grocery store, cooking more meals at home, batch preparing whole food ingredients, choosing whole grains over refined grains, and reading ingredient labels with awareness of hidden sugars, refined oils, and chemical additives.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Familiarize yourself with the NOVA classification system and be able to categorize foods into the four groups. Understand the distinction between acceptable processing (fermenting, freezing) and ultra-processing. Know that nutrient density — not simply calorie counting — is the foundation of holistic nutrition dietary recommendations.</div>
`
    },

    {
      module_id: moduleIdMap['1-4'],
      lesson_order: 2,
      title: 'Organic Foods & Environmental Toxins',
      subtitle: 'Pesticide exposure, the Dirty Dozen, heavy metals, and reducing toxic burden',
      estimated_minutes: 15,
      exam_alert: false,
      key_takeaways: JSON.stringify([
        'Organic certification prohibits synthetic pesticides, herbicides, GMOs, and irradiation — organic produce has significantly lower pesticide residues.',
        'The Environmental Working Group publishes the annual Dirty Dozen (highest pesticide residues) and Clean Fifteen (lowest residues) lists to guide purchasing decisions.',
        'Glyphosate (Roundup) is the most widely used herbicide globally and has been classified as a "probable human carcinogen" by the IARC.',
        'Heavy metals (lead, mercury, cadmium, arsenic) accumulate in the body and can impair neurological function, kidney function, and development.',
        'Reducing toxic burden involves choosing organic when possible, filtering water, avoiding plastic food containers, and supporting detoxification pathways nutritionally.'
      ]),
      content_html: `
<h2>Organic Foods &amp; Environmental Toxins</h2>

<h3>Understanding Organic Certification</h3>
<p>Organic food production adheres to standards that prohibit the use of synthetic pesticides, herbicides, fungicides, genetically modified organisms (GMOs), sewage sludge fertilizers, irradiation, and most synthetic food additives. In the United States, the USDA Organic certification requires adherence to the National Organic Program (NOP) standards. Organic livestock must be raised without antibiotics or growth hormones and given access to the outdoors and organic feed.</p>

<p>Research comparing organic and conventional produce shows that organic foods have <strong>significantly lower pesticide residues</strong> (approximately 80% lower), higher levels of certain antioxidants and polyphenols (10-60% higher in some studies), no synthetic fertilizer chemical residues, and comparable macronutrient content. The primary health argument for organic food centers on reducing cumulative chemical exposure rather than dramatic differences in nutritional content.</p>

<h3>Pesticide Exposure and Health Concerns</h3>
<p>Conventional agriculture relies heavily on synthetic chemicals. The most prevalent concerns include:</p>

<p><strong>Organophosphate pesticides:</strong> Inhibit acetylcholinesterase, an enzyme critical for nervous system function. Linked to neurodevelopmental delays in children, reduced IQ, ADHD-like symptoms, and potential endocrine disruption. The developing fetus and young children are most vulnerable due to immature detoxification systems and higher food intake relative to body weight.</p>

<p><strong>Glyphosate:</strong> The active ingredient in Roundup, it is the most widely used herbicide globally, applied to both conventional and GMO crops. Classified as a "probable human carcinogen" (Group 2A) by the International Agency for Research on Cancer (IARC). Research suggests it may disrupt the gut microbiome (it inhibits the shikimate pathway in bacteria), impair mineral chelation (binding manganese, cobalt, and other trace minerals), and contribute to intestinal permeability.</p>

<p>The Environmental Working Group (EWG) publishes annual guides to help consumers prioritize organic purchases. The <strong>Dirty Dozen</strong> lists the 12 conventional produce items with the highest pesticide residues (commonly including strawberries, spinach, kale, nectarines, apples, grapes, and peppers). The <strong>Clean Fifteen</strong> identifies the 15 items with the lowest residues (typically avocados, sweet corn, pineapple, onions, and cabbage), which are considered safer to buy conventionally.</p>

<div class="callout"><strong>Clinical Note:</strong> Not all clients can afford a fully organic diet. Prioritizing organic purchases using the Dirty Dozen/Clean Fifteen framework is a practical strategy. Additionally, thorough washing of conventional produce (using a diluted vinegar solution or a produce wash), peeling when practical, and choosing locally grown seasonal produce (which often requires fewer pesticides) can reduce exposure. For animal products, prioritizing organic or pasture-raised is particularly important for meat and dairy, where pesticides, hormones, and antibiotics bioaccumulate in fat tissue.</div>

<h3>Heavy Metals</h3>
<p>Heavy metal exposure is an increasing concern in the food supply:</p>
<ul>
  <li><strong>Mercury:</strong> Primarily from large predatory fish (swordfish, shark, king mackerel, tilefish, and certain tuna species) due to bioaccumulation. Methylmercury is a potent neurotoxin. Lower-mercury fish choices include salmon, sardines, anchovies, and herring (remembered by the acronym SMASH).</li>
  <li><strong>Lead:</strong> Can be found in some bone broth (lead is stored in bones), imported spices, older plumbing, and contaminated soil. No safe level of lead exposure exists, particularly for children.</li>
  <li><strong>Arsenic:</strong> Concentrated in rice (which is grown in flooded paddies that concentrate arsenic from soil), rice products, and some well water. Soaking and cooking rice in excess water can reduce arsenic content by 40-60%.</li>
  <li><strong>Cadmium:</strong> Found in chocolate, spinach, potatoes, grains, and cigarette smoke. Accumulates in kidneys with chronic low-level exposure.</li>
</ul>

<h3>Other Environmental Toxins in the Food Supply</h3>
<p><strong>Endocrine-disrupting chemicals (EDCs)</strong> are compounds that interfere with hormone signaling. Key EDCs include BPA and phthalates (from plastic containers and can linings — avoid heating food in plastic and choose BPA-free cans or glass), per- and polyfluoroalkyl substances (PFAS, "forever chemicals" in nonstick cookware and food packaging), and dioxins and PCBs (persistent organic pollutants that bioaccumulate in animal fat). Reducing exposure involves choosing glass and stainless steel food storage, avoiding plastic wrap contact with hot foods, filtering drinking water (a high-quality carbon or reverse osmosis filter removes most contaminants), and selecting lower-toxin cookware (cast iron, stainless steel, ceramic).</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Know the Dirty Dozen / Clean Fifteen concept and the EWG as the source. Understand that the primary argument for organic food is reduced chemical exposure, not dramatically different nutritional content. Be familiar with mercury in fish (large predatory fish = highest mercury; SMASH fish = lower mercury) and arsenic in rice (plus the rinsing/cooking strategy to reduce it).</div>
`
    },

    {
      module_id: moduleIdMap['1-4'],
      lesson_order: 3,
      title: 'Food Sensitivities & Allergies',
      subtitle: 'IgE allergies, IgG sensitivities, intolerances, and elimination diet protocols',
      estimated_minutes: 16,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'True food allergies (IgE-mediated) cause immediate immune reactions that can be life-threatening (anaphylaxis); the top 9 allergens account for 90% of allergic reactions.',
        'Food sensitivities (often IgG-mediated) cause delayed, less severe reactions (hours to days) — symptoms include bloating, fatigue, headaches, joint pain, and skin issues.',
        'Food intolerances involve enzymatic or chemical mechanisms rather than immune responses — lactose intolerance and histamine intolerance are the most common.',
        'The elimination diet is the gold standard for identifying food sensitivities — remove suspected foods for 3-4 weeks, then reintroduce one at a time.',
        'Intestinal hyperpermeability ("leaky gut") is a key underlying factor in the development of food sensitivities.'
      ]),
      content_html: `
<h2>Food Sensitivities &amp; Allergies</h2>

<h3>Types of Adverse Food Reactions</h3>
<p>Adverse reactions to food fall into three primary categories, each with distinct mechanisms, onset timing, and clinical severity:</p>

<p><strong>1. Food Allergy (IgE-mediated, Type I Hypersensitivity):</strong> A true food allergy involves an <strong>immediate immune response</strong> mediated by immunoglobulin E (IgE) antibodies. Upon first exposure, the immune system produces IgE antibodies specific to a food protein and sensitizes mast cells and basophils. Upon subsequent exposure, the allergen cross-links IgE on these cells, triggering rapid degranulation and release of histamine, leukotrienes, and prostaglandins. Symptoms appear within minutes to two hours and include hives (urticaria), swelling (angioedema), itching, vomiting, diarrhea, wheezing, and in severe cases, <strong>anaphylaxis</strong> — a life-threatening systemic reaction involving airway constriction, severe blood pressure drop, and potential cardiac arrest.</p>

<p>The nine major food allergens (mandated for labeling in the U.S. under FALCPA and the FASTER Act) are: milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans, and sesame. These account for approximately 90% of food allergic reactions. True food allergies are diagnosed via skin prick testing, serum-specific IgE testing, and oral food challenges (the gold standard). They require strict avoidance of the allergen and carrying emergency epinephrine (EpiPen).</p>

<div class="callout"><strong>Clinical Note:</strong> As a holistic nutrition consultant, it is outside the scope of practice to diagnose food allergies. If a client describes symptoms consistent with IgE-mediated allergy (immediate onset, hives, swelling, breathing difficulty), refer to an allergist or immunologist for proper testing. Holistic practitioners can, however, support clients with known allergies through allergen-free meal planning, nutrient adequacy assessment, and gut-healing protocols to address underlying immune dysregulation.</div>

<p><strong>2. Food Sensitivity (IgG-mediated or non-IgE immune-mediated):</strong> Food sensitivities involve a <strong>delayed immune response</strong>, typically mediated by IgG antibodies and/or immune complex formation. Symptoms appear hours to days after ingestion and are often chronic and diffuse, making identification challenging. Common symptoms include bloating and gas, headaches and migraines, fatigue and brain fog, joint pain and stiffness, skin issues (eczema, acne, rashes), mood disturbances, nasal congestion, and digestive irregularity.</p>

<p>IgG food sensitivity testing (blood panels measuring IgG antibodies to various foods) is commercially available but remains <strong>controversial</strong> in conventional medicine. Critics argue that elevated IgG may represent normal immune exposure to foods, not pathological sensitivity. Many holistic practitioners find these tests clinically useful as a starting point when combined with an elimination diet for confirmation. The <strong>elimination diet</strong> remains the gold standard for identifying food sensitivities.</p>

<p><strong>3. Food Intolerance (non-immune-mediated):</strong> Food intolerances involve enzymatic deficiencies, chemical sensitivities, or other non-immune mechanisms. Examples include lactose intolerance (deficiency of lactase enzyme), fructose malabsorption, histamine intolerance (deficiency of diamine oxidase or DAO enzyme, leading to accumulation of histamine from foods), sensitivity to food additives (sulfites, MSG, artificial colors), and FODMAP intolerance (fermentable oligosaccharides, disaccharides, monosaccharides, and polyols that cause osmotic diarrhea and bacterial fermentation in sensitive individuals).</p>

<h3>The Elimination Diet Protocol</h3>
<p>The elimination diet is a systematic approach to identifying food sensitivities. The protocol involves two phases:</p>

<p><strong>Phase 1 — Elimination (3-4 weeks):</strong> Remove the most common trigger foods: gluten, dairy, eggs, soy, corn, peanuts, sugar, alcohol, caffeine, and any suspected personal triggers. During this phase, clients eat a clean diet of vegetables, fruits, quality proteins (poultry, fish, legumes), healthy fats, nuts and seeds (except peanuts), gluten-free whole grains (rice, quinoa, millet), and herbs and spices. Most clients notice symptom improvement within 2-3 weeks if a food sensitivity is present.</p>

<p><strong>Phase 2 — Reintroduction (4-6 weeks):</strong> Reintroduce one food at a time, in a pure form, consuming it 2-3 times over a single day, then monitoring for reactions over the following 72 hours before introducing the next food. Any return of symptoms indicates a sensitivity. Common reintroduction order: eggs, dairy, gluten, soy, corn, peanuts, then others as relevant.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Know the three categories of adverse food reactions and their mechanisms: IgE (immediate, potentially life-threatening), IgG/sensitivity (delayed, chronic symptoms), and intolerance (non-immune, enzymatic/chemical). The elimination diet protocol — 3-4 weeks elimination followed by systematic one-at-a-time reintroduction with 72-hour observation — is a high-yield exam topic. Know the top 9 allergens and understand that food allergy diagnosis is outside the holistic nutrition scope of practice.</div>

<h3>Intestinal Permeability and Food Sensitivities</h3>
<p>The intestinal epithelium is a single-cell-thick barrier that selectively permits nutrient absorption while preventing the passage of harmful substances into the bloodstream. When the tight junctions between enterocytes are compromised — a condition referred to as <strong>intestinal hyperpermeability or "leaky gut"</strong> — larger, partially digested food proteins can cross the barrier and trigger immune responses, contributing to the development of new food sensitivities.</p>

<p>Factors that increase intestinal permeability include chronic stress, NSAIDs, alcohol, dysbiosis, gluten (via zonulin release in susceptible individuals), infections, and nutrient deficiencies (zinc, vitamin A, glutamine, vitamin D). Addressing the underlying permeability issue through gut-healing protocols (the "4R" or "5R" framework: Remove, Replace, Reinoculate, Repair, Rebalance) is essential for resolving food sensitivities long-term, rather than simply avoiding trigger foods indefinitely.</p>
`
    },

    // ── Module 5: Dietary Systems & Special Populations ──────────
    {
      module_id: moduleIdMap['1-5'],
      lesson_order: 1,
      title: 'Dietary Philosophies',
      subtitle: 'Comparing major dietary approaches and their evidence base',
      estimated_minutes: 16,
      exam_alert: false,
      key_takeaways: JSON.stringify([
        'No single dietary philosophy is optimal for all individuals — biochemical individuality, cultural background, health status, and personal values all influence the best approach.',
        'The Mediterranean diet has the strongest overall evidence base for cardiovascular health, longevity, and chronic disease prevention.',
        'Plant-based diets (vegetarian, vegan) require careful attention to B12, iron, zinc, omega-3s, calcium, and complete protein intake.',
        'Ancestral/paleo approaches emphasize whole foods and eliminate processed foods, grains, and dairy; benefits may come more from what is removed (UPFs) than from specific food exclusions.',
        'Holistic nutrition consultants should be knowledgeable about multiple dietary approaches while avoiding dogmatic adherence to any single system.'
      ]),
      content_html: `
<h2>Dietary Philosophies</h2>

<h3>Bioindividuality and Dietary Diversity</h3>
<p>A foundational principle of holistic nutrition is <strong>bioindividuality</strong> — the recognition that each person has unique nutritional needs influenced by genetics, epigenetics, microbiome composition, metabolic type, health status, activity level, stress load, environmental exposures, cultural background, and personal values. No single dietary philosophy is universally optimal. The holistic nutrition consultant must understand the major dietary approaches, their evidence bases, and their potential benefits and limitations to help each client find the most appropriate eating pattern.</p>

<h3>Mediterranean Diet</h3>
<p>The Mediterranean diet is modeled on the traditional eating patterns of countries bordering the Mediterranean Sea, particularly Greece, southern Italy, and Spain, as observed in the 1960s. It emphasizes abundant vegetables, fruits, whole grains, legumes, nuts, seeds, and olive oil as the primary fat source; moderate consumption of fish, poultry, eggs, and fermented dairy (yogurt, cheese); and limited red meat, sweets, and processed foods. Red wine in moderation is traditional but not required.</p>

<p>The Mediterranean diet has the <strong>most robust evidence base</strong> of any named dietary pattern, with large-scale clinical trials (including PREDIMED) demonstrating significant reductions in cardiovascular events, stroke, type 2 diabetes, cognitive decline, depression, and all-cause mortality. Its benefits are attributed to the synergistic combination of anti-inflammatory fats (olive oil, omega-3s from fish), antioxidant-rich plant foods, fiber from whole grains and legumes, and the relative absence of ultra-processed foods.</p>

<h3>Plant-Based Diets</h3>
<p>Plant-based diets exist on a spectrum:</p>
<ul>
  <li><strong>Flexitarian:</strong> Predominantly plant-based with occasional meat and animal products.</li>
  <li><strong>Pescatarian:</strong> Plant-based plus fish and seafood (and often dairy and eggs).</li>
  <li><strong>Lacto-ovo vegetarian:</strong> Plant-based plus dairy and eggs, excluding all meat and fish.</li>
  <li><strong>Vegan:</strong> Exclusively plant-based, excluding all animal-derived foods.</li>
</ul>

<p>Well-planned plant-based diets are associated with lower rates of heart disease, hypertension, type 2 diabetes, certain cancers, and obesity. However, they require <strong>careful nutritional planning</strong> to prevent deficiencies in vitamin B12 (supplementation essential for vegans), iron (non-heme only; enhanced by vitamin C), zinc (lower bioavailability from plant sources), omega-3 fatty acids (ALA conversion to EPA/DHA is inefficient; algae-based DHA supplement recommended), calcium (adequate through fortified foods and high-calcium plants), vitamin D (supplementation usually needed), and iodine (if iodized salt is not used).</p>

<div class="callout"><strong>Clinical Note:</strong> When supporting clients on plant-based diets, routine monitoring of B12 status (methylmalonic acid is the most sensitive marker), iron status (ferritin), and vitamin D is advisable. Recommend a comprehensive B12 supplement (methylcobalamin or cyanocobalamin, 250-500 mcg daily or 2500 mcg weekly) for all vegans and most vegetarians. For clients transitioning to plant-based eating, provide guidance on complementary protein combining, iron-rich plant foods paired with vitamin C, and whole food sources versus processed plant-based alternatives (which can be highly processed).</div>

<h3>Ancestral and Paleo Approaches</h3>
<p>The Paleolithic (paleo) diet is based on the premise that humans are genetically adapted to the foods available during the Paleolithic era (approximately 2.5 million to 10,000 years ago), before the advent of agriculture. It emphasizes meat, fish, vegetables, fruits, nuts, and seeds while excluding grains, legumes, dairy, refined sugar, and processed foods. Variations include the Autoimmune Protocol (AIP), which further removes eggs, nightshades, nuts, and seeds to reduce immune triggers.</p>

<p>Evidence for the paleo diet shows benefits for blood sugar regulation, weight management, and inflammatory markers. Critics note that Paleolithic diets varied dramatically by geography and season, and that the elimination of whole grains and legumes removes well-studied health-promoting foods. Much of the clinical benefit may derive from the removal of ultra-processed foods, refined sugars, and industrial seed oils rather than the specific exclusion of grains or legumes.</p>

<h3>Other Notable Approaches</h3>
<p><strong>Ketogenic diet:</strong> Very low carbohydrate (typically below 50 g/day), moderate protein, high fat. Induces nutritional ketosis. Clinically supported for epilepsy management, and emerging evidence for type 2 diabetes, neurodegenerative conditions, and certain cancers. Not appropriate for all individuals and requires monitoring.</p>

<p><strong>Anti-inflammatory diet:</strong> Emphasizes omega-3 fatty acids, colorful fruits and vegetables, turmeric and ginger, green tea, and eliminates sugar, refined carbohydrates, industrial seed oils, and trans fats. A practical framework for clients with chronic inflammatory conditions.</p>

<p><strong>DASH diet (Dietary Approaches to Stop Hypertension):</strong> Emphasizes fruits, vegetables, whole grains, lean proteins, and low-fat dairy while limiting sodium, saturated fat, and sugar. Clinically proven to reduce blood pressure.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Be able to compare major dietary approaches, identify nutrient risks for each (especially B12, iron, and omega-3 for vegan diets), and articulate the principle of bioindividuality. The Mediterranean diet's evidence base is the strongest — know the PREDIMED trial. Understand that the holistic nutrition consultant's role is to guide clients toward the best individual fit, not to advocate for a single dietary ideology.</div>
`
    },

    {
      module_id: moduleIdMap['1-5'],
      lesson_order: 2,
      title: 'Nutrition Across the Lifespan',
      subtitle: 'Prenatal, pediatric, adolescent, adult, and geriatric nutritional needs',
      estimated_minutes: 17,
      exam_alert: true,
      key_takeaways: JSON.stringify([
        'Nutritional needs vary significantly across life stages — prenatal nutrition (especially folate, iron, DHA, and choline) has lifelong impacts on child development.',
        'Breastmilk is the optimal infant nutrition source, providing immunoglobulins, prebiotics, and a composition that adapts to the infant\'s changing needs.',
        'Adolescents have increased needs for calcium, iron, and zinc during rapid growth; eating disorders are most common in this population.',
        'Adults face metabolic slowing, stress-related nutrient depletion, and chronic disease prevention as primary nutritional concerns.',
        'Older adults require increased protein, vitamin D, B12, and calcium, with attention to sarcopenia, bone density, cognitive decline, and medication-nutrient interactions.'
      ]),
      content_html: `
<h2>Nutrition Across the Lifespan</h2>

<h3>Prenatal and Preconception Nutrition</h3>
<p>Nutritional status before and during pregnancy profoundly influences fetal development and long-term offspring health — a concept formalized in the <strong>Developmental Origins of Health and Disease (DOHaD)</strong> hypothesis. Ideally, nutritional optimization begins <strong>3-6 months before conception</strong> to build nutrient stores, support egg quality, and establish a healthy metabolic environment.</p>

<p><strong>Critical nutrients during pregnancy:</strong></p>
<ul>
  <li><strong>Folate (vitamin B9):</strong> Essential for neural tube closure, which occurs by day 28 of gestation — often before a woman knows she is pregnant. The recommended intake is 600 mcg DFE daily (400 mcg supplement recommended for all women of childbearing age). The active form methylfolate (5-MTHF) is preferred for women with MTHFR polymorphisms.</li>
  <li><strong>Iron:</strong> Needs nearly double during pregnancy (27 mg/day) to support expanded blood volume and fetal development. Iron deficiency anemia during pregnancy increases risk of preterm birth, low birth weight, and postpartum depression.</li>
  <li><strong>DHA (omega-3):</strong> Critical for fetal brain and retinal development, particularly during the third trimester when rapid brain growth occurs. A minimum of 200-300 mg DHA daily is recommended, with many holistic practitioners suggesting higher amounts.</li>
  <li><strong>Choline:</strong> Essential for fetal brain development (hippocampal formation), neural tube closure, and placental function. The adequate intake is 450 mg during pregnancy. Eggs are the richest food source (approximately 150 mg per egg). Choline is often absent from standard prenatal vitamins.</li>
  <li><strong>Iodine:</strong> Required for fetal thyroid hormone production and brain development. Deficiency during pregnancy is the most common preventable cause of intellectual disability worldwide. Recommended at 220 mcg daily during pregnancy.</li>
</ul>

<div class="callout"><strong>Clinical Note:</strong> Prenatal nutrition counseling is well within the holistic nutrition scope of practice, but pregnancy-specific supplementation and management of gestational diabetes, preeclampsia, or other medical complications require collaboration with the client's midwife or obstetrician. Focus on whole food nutrition, adequate hydration, blood sugar stability, reducing toxin exposure, and addressing common pregnancy complaints (nausea, constipation, heartburn) through food-based strategies.</div>

<h3>Infancy and Early Childhood</h3>
<p><strong>Breastmilk</strong> is recognized by all major health organizations as the optimal nutrition source for infants during the first six months of life and complementary to solid foods through at least 12-24 months. Breastmilk provides immunoglobulins (especially secretory IgA), which protect the immature infant gut; human milk oligosaccharides (HMOs), which serve as prebiotics feeding beneficial Bifidobacterium species; the ideal balance of macronutrients and micronutrients that adapts to the infant's developmental stage; enzymes (lipase, amylase) that aid digestion; and growth factors that support intestinal maturation.</p>

<p>Introduction of solid foods (complementary feeding) typically begins around 6 months. Current evidence supports early introduction of common allergenic foods (peanuts, eggs, dairy, wheat) between 4-6 months to reduce allergy risk, rather than delaying introduction as was previously recommended. Iron-rich foods (pureed meat, iron-fortified cereals, lentils) should be among the first complementary foods, as infant iron stores from birth begin depleting around 6 months.</p>

<h3>Adolescence</h3>
<p>The adolescent growth spurt creates increased nutritional demands, particularly for <strong>calcium</strong> (1,300 mg/day — the highest requirement of any life stage, as approximately 45% of adult bone mass is built during adolescence), <strong>iron</strong> (boys need 11 mg and girls 15 mg after menarche begins), <strong>zinc</strong> (for growth, sexual maturation, and immune function), and overall energy and protein to support rapid tissue growth.</p>

<p>Nutritional challenges in adolescence include fast food and ultra-processed food consumption, skipping meals (especially breakfast), dieting and body image concerns, eating disorders (anorexia nervosa, bulimia, and binge eating disorder are most common in this age group), and nutrient depletion from sports and physical activity. Holistic practitioners working with adolescents should be attuned to signs of disordered eating and prepared to refer to eating disorder specialists when indicated.</p>

<h3>Adulthood</h3>
<p>Adult nutritional priorities shift toward chronic disease prevention, stress management, hormonal balance, and maintaining metabolic health. Metabolic rate gradually declines with age — approximately 1-2% per decade after age 20 — largely due to loss of lean muscle mass (sarcopenia). Maintaining muscle through adequate protein intake (1.0-1.2 g/kg body weight) and resistance exercise becomes increasingly important.</p>

<p>Common adult nutritional concerns include blood sugar dysregulation and insulin resistance, chronic stress and cortisol-related nutrient depletion (magnesium, B vitamins, vitamin C, zinc), hormonal transitions (perimenopause, menopause in women; andropause in men), digestive decline (reduced stomach acid, enzyme production, and bile output), and increasing toxin accumulation requiring detoxification support.</p>

<h3>Older Adults (65+)</h3>
<p>Aging brings physiological changes that alter nutritional needs:</p>
<ul>
  <li><strong>Protein:</strong> Increased to 1.0-1.2 g/kg or higher to combat sarcopenia and support immune function. The anabolic response to protein becomes blunted (anabolic resistance), requiring higher protein per meal (25-30 g with adequate leucine).</li>
  <li><strong>Vitamin D:</strong> Skin synthesis decreases with age, and kidney activation of vitamin D declines. Higher supplementation (1,000-4,000 IU/day) is often needed.</li>
  <li><strong>Vitamin B12:</strong> Absorption decreases due to reduced stomach acid and intrinsic factor. Supplemental B12 (sublingual or injection) may be necessary regardless of dietary intake.</li>
  <li><strong>Calcium:</strong> Combined with vitamin D and K2 for bone density maintenance and osteoporosis prevention.</li>
  <li><strong>Hydration:</strong> Thirst perception diminishes with age, increasing dehydration risk.</li>
</ul>

<div class="exam-tip"><strong>Exam Tip:</strong> Lifespan nutrition is a heavily tested topic. Know critical prenatal nutrients (folate, iron, DHA, choline, iodine) and their specific roles. Understand that breastmilk is the gold standard for infant nutrition and that early allergen introduction is now recommended. For older adults, know the key nutrients requiring increased attention (protein, D, B12, calcium) and the concept of anabolic resistance. Questions often present clinical scenarios asking you to identify the most at-risk nutrient for a given life stage.</div>
`
    },

    {
      module_id: moduleIdMap['1-5'],
      lesson_order: 3,
      title: 'Sports Nutrition & Weight Management',
      subtitle: 'Performance fueling, body composition, and evidence-based approaches to healthy weight',
      estimated_minutes: 16,
      exam_alert: false,
      key_takeaways: JSON.stringify([
        'Energy balance (calories in vs. calories out) is the fundamental driver of weight change, but hormonal, metabolic, and psychological factors profoundly influence both sides of the equation.',
        'Athletes require increased energy, protein (1.2-2.0 g/kg), carbohydrates for glycogen replenishment, and attention to hydration and electrolyte balance.',
        'Chronic caloric restriction can lower basal metabolic rate through adaptive thermogenesis, making sustained weight loss progressively more difficult.',
        'Set point theory suggests the body defends a genetically and hormonally influenced weight range; addressing insulin resistance, sleep, stress, and gut health can shift this set point.',
        'Holistic weight management focuses on nutrient density, blood sugar stability, hormonal balance, stress management, sleep quality, and sustainable behavior change rather than restrictive dieting.'
      ]),
      content_html: `
<h2>Sports Nutrition &amp; Weight Management</h2>

<h3>Energy Balance and Body Composition</h3>
<p>At its most fundamental level, body weight is influenced by <strong>energy balance</strong> \u2014 the relationship between energy intake (calories consumed) and energy expenditure (calories used). Energy expenditure comprises three components: basal metabolic rate (BMR, approximately 60-70% of total daily expenditure), the thermic effect of food (TEF, approximately 10%, with protein having the highest thermic effect at 20-30%), and physical activity (approximately 20-30%, highly variable). However, this simple equation is profoundly modulated by hormonal signaling, metabolic adaptation, gut microbiome composition, sleep quality, stress levels, genetic factors, and the nutrient composition of the diet.</p>

<p><strong>Body composition</strong> \u2014 the ratio of lean mass (muscle, bone, organs) to fat mass \u2014 is a more clinically meaningful measure than body weight alone. Two individuals at the same weight can have dramatically different health profiles based on their body composition. Assessing body composition through methods such as bioelectrical impedance analysis (BIA), skinfold measurements, or DEXA scans provides better insight than BMI alone, which does not differentiate between lean and fat mass.</p>

<h3>Sports Nutrition Fundamentals</h3>
<p>Active individuals and athletes have heightened nutritional demands that must be met to support performance, recovery, and long-term health:</p>

<ul>
  <li><strong>Protein:</strong> Athletes require 1.2-2.0 g/kg body weight daily, depending on the type and intensity of training. Endurance athletes typically need 1.2-1.6 g/kg; strength and power athletes need 1.6-2.0 g/kg. Distributing protein intake across meals (20-40 g per meal with adequate leucine) optimizes muscle protein synthesis throughout the day. Post-exercise protein within 2 hours supports recovery, though the &quot;anabolic window&quot; is broader than previously believed.</li>
  <li><strong>Carbohydrates:</strong> The primary fuel for moderate to high-intensity exercise. Glycogen stores in muscle and liver are limited (approximately 2,000 kcal) and must be replenished through dietary carbohydrates. Endurance athletes may need 5-10 g/kg body weight daily. Timing carbohydrate intake around training sessions \u2014 particularly consuming carbohydrates within 30-60 minutes post-exercise \u2014 accelerates glycogen resynthesis.</li>
  <li><strong>Hydration:</strong> Even mild dehydration (2% body weight loss) impairs performance, cognitive function, and thermoregulation. Athletes should consume fluids before, during, and after exercise. For sessions exceeding 60 minutes or in hot conditions, electrolyte replacement (sodium, potassium, magnesium) becomes important. Monitoring urine color (pale yellow indicates adequate hydration) is a practical self-assessment tool.</li>
  <li><strong>Micronutrients of concern:</strong> Iron (especially in female athletes and endurance runners \u2014 foot-strike hemolysis and sweat losses increase needs), magnesium (lost through sweat, critical for muscle function and recovery), vitamin D (supports bone health and immune function), and B vitamins (coenzymes in energy metabolism).</li>
</ul>

<div class="callout"><strong>Clinical Note:</strong> Relative Energy Deficiency in Sport (RED-S), formerly known as the Female Athlete Triad, describes a syndrome of impaired physiological function caused by relative energy deficiency. It affects both male and female athletes and can lead to menstrual dysfunction, decreased bone mineral density, impaired immunity, cardiovascular compromise, and psychological issues. RED-S should be suspected in athletes with unexplained performance decline, recurrent injuries, amenorrhea, or signs of disordered eating. Early identification and referral to a sports medicine team is essential.</div>

<h3>Holistic Weight Management</h3>
<p>The holistic approach to weight management differs fundamentally from conventional calorie-restriction dieting. Rather than focusing solely on caloric reduction, holistic practitioners address the <strong>root causes of weight dysregulation</strong>:</p>

<ul>
  <li><strong>Blood sugar stability:</strong> Chronic blood sugar spikes and crashes drive insulin resistance, promote fat storage (particularly visceral fat), and trigger cravings. Balancing meals with protein, healthy fats, and fiber-rich carbohydrates is foundational.</li>
  <li><strong>Hormonal balance:</strong> Thyroid dysfunction, cortisol dysregulation, estrogen dominance, leptin resistance, and low testosterone all influence body composition independent of caloric intake. Addressing these imbalances is often necessary for sustainable weight change.</li>
  <li><strong>Sleep quality:</strong> Sleep deprivation (fewer than 7 hours) increases ghrelin (hunger hormone), decreases leptin (satiety hormone), promotes insulin resistance, and impairs decision-making around food. Optimizing sleep is a high-leverage intervention for weight management.</li>
  <li><strong>Stress and cortisol:</strong> Chronic stress elevates cortisol, which promotes visceral fat accumulation, increases appetite (particularly for hyperpalatable foods), breaks down lean tissue, and impairs metabolic function. Stress management through adaptogenic herbs, mindfulness, movement, and lifestyle modifications is integral.</li>
  <li><strong>Gut health:</strong> The gut microbiome influences energy extraction from food, fat storage signaling, inflammation, and appetite regulation. Dysbiosis and intestinal permeability are associated with obesity and metabolic dysfunction.</li>
</ul>

<p><strong>Adaptive thermogenesis</strong> is the body\u2019s response to sustained caloric restriction \u2014 BMR decreases beyond what would be predicted by weight loss alone, as the body attempts to conserve energy. This metabolic adaptation explains why many individuals regain weight after dieting and why successive diets become less effective. Avoiding severe caloric restriction (no more than a 15-20% deficit), preserving lean muscle mass through adequate protein and resistance training, and taking periodic diet breaks can mitigate this adaptation.</p>

<div class="exam-tip"><strong>Exam Tip:</strong> Understand the holistic factors that influence body weight beyond simple calorie counting \u2014 insulin resistance, cortisol, thyroid function, sleep, and gut health are all testable concepts. Know athlete protein requirements (1.2-2.0 g/kg range) and the importance of carbohydrate timing for glycogen replenishment. Be familiar with RED-S (Relative Energy Deficiency in Sport) and adaptive thermogenesis as barriers to sustained weight loss.</div>
`
    },

  ];
}

// \u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
// PLACEHOLDER LESSONS FOR DOMAINS 2-5
// ═══════════════════════════════════════════════════════════════

function placeholderLessons(moduleIdMap) {
  const lessons = [];

  // Domain 2: Anatomy, Physiology & Biochemistry (12 lessons: 3+3+3+3)
  const d2 = [
    { mod: '2-1', titles: ['Cardiovascular & Respiratory Systems', 'Immune & Lymphatic Systems', 'Nervous System Fundamentals'] },
    { mod: '2-2', titles: ['Upper GI: Mouth, Esophagus & Stomach', 'Lower GI: Small & Large Intestine', 'Gut Microbiome & Intestinal Permeability'] },
    { mod: '2-3', titles: ['Blood Sugar Regulation & Insulin Signaling', 'Thyroid & Adrenal Function', 'Sex Hormones & Reproductive Health'] },
    { mod: '2-4', titles: ['Mitochondrial Energy Production', 'Oxidative Stress & Detoxification Pathways', 'Methylation & Genetic Individuality'] },
  ];

  // Domain 3: Professional Practice (8 lessons: 3+3+2)
  const d3 = [
    { mod: '3-1', titles: ['Defining the HNC Scope of Practice', 'Legal & Regulatory Considerations', 'Referral Networks & Collaborative Care'] },
    { mod: '3-2', titles: ['Motivational Interviewing Techniques', 'Behavior Change Models', 'Client Education & Goal Setting'] },
    { mod: '3-3', titles: ['Ethical Principles & Confidentiality', 'Professional Boundaries & Self-Care'] },
  ];

  // Domain 4: Clinical Applications (22 lessons: 3+4+4+4+4+3)
  const d4 = [
    { mod: '4-1', titles: ['Health History & Nutritional Intake Assessment', 'Physical Signs of Nutritional Deficiency', 'Functional Lab Interpretation Basics'] },
    { mod: '4-2', titles: ['IBS & Functional GI Disorders', 'GERD & Upper GI Conditions', 'SIBO & Intestinal Permeability', 'IBD: Crohn\'s & Ulcerative Colitis'] },
    { mod: '4-3', titles: ['Type 2 Diabetes & Metabolic Syndrome', 'Thyroid Disorders (Hypo & Hyper)', 'Adrenal Dysfunction & HPA Axis', 'PCOS & Hormonal Imbalances'] },
    { mod: '4-4', titles: ['The Gut-Brain Axis', 'Nutritional Support for Anxiety & Depression', 'Cognitive Decline & Neurodegenerative Disease', 'ADHD & Pediatric Neurological Support'] },
    { mod: '4-5', titles: ['Joint Health & Osteoporosis', 'Skin Conditions (Eczema, Psoriasis, Acne)', 'Autoimmune Disease Fundamentals', 'Cardiovascular Health & Lipid Management'] },
    { mod: '4-6', titles: ['Supplement Protocol Design', 'Herb-Drug & Nutrient-Drug Interactions', 'Functional Testing: Stool, Organic Acids & More'] },
  ];

  // Domain 5: Research & Evidence (8 lessons: 2+3+3)
  const d5 = [
    { mod: '5-1', titles: ['Types of Research Studies', 'Variables, Controls & Sampling'] },
    { mod: '5-2', titles: ['Critical Appraisal of Research Papers', 'Understanding Statistical Significance', 'Identifying Bias & Confounders'] },
    { mod: '5-3', titles: ['From Evidence to Practice', 'Evaluating Supplement & Diet Claims', 'Staying Current: Journals & Databases'] },
  ];

  const allPlaceholders = [...d2, ...d3, ...d4, ...d5];
  for (const group of allPlaceholders) {
    group.titles.forEach((title, i) => {
      lessons.push({
        module_id: moduleIdMap[group.mod],
        lesson_order: i + 1,
        title,
        subtitle: null,
        estimated_minutes: 15,
        exam_alert: false,
        key_takeaways: null,
        content_html: null,
      });
    });
  }
  return lessons;
}

// ═══════════════════════════════════════════════════════════════
// MAIN IMPORT FUNCTION
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('=== BCHN Exam Prep: Curriculum Import ===\n');

  // Step 1: Clean slate
  console.log('1. Clearing existing study_lessons...');
  const { error: delLessons } = await sb.from('study_lessons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delLessons) { console.error('  Error deleting lessons:', delLessons.message); } else { console.log('  Done.'); }

  console.log('2. Clearing existing study_modules...');
  const { error: delModules } = await sb.from('study_modules').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delModules) { console.error('  Error deleting modules:', delModules.message); } else { console.log('  Done.'); }

  // Step 2: Insert all modules
  console.log('\n3. Inserting all modules (5 domains)...');
  const { data: insertedModules, error: modErr } = await sb
    .from('study_modules')
    .insert(ALL_MODULES)
    .select('id, domain, module_order, title');

  if (modErr) {
    console.error('  FATAL: Failed to insert modules:', modErr.message);
    process.exit(1);
  }
  console.log(`  Inserted ${insertedModules.length} modules.`);

  // Build module ID map: "domain-module_order" -> uuid
  const moduleIdMap = {};
  for (const m of insertedModules) {
    const key = `${m.domain}-${m.module_order}`;
    moduleIdMap[key] = m.id;
    console.log(`  [${key}] ${m.title} -> ${m.id}`);
  }

  // Step 3: Insert Domain 1 lessons with full content
  console.log('\n4. Inserting Domain 1 lessons (full content)...');
  const d1Lessons = domain1Lessons(moduleIdMap);
  const { data: insertedD1, error: d1Err } = await sb
    .from('study_lessons')
    .insert(d1Lessons)
    .select('id, title, lesson_order');

  if (d1Err) {
    console.error('  FATAL: Failed to insert Domain 1 lessons:', d1Err.message);
    process.exit(1);
  }
  console.log(`  Inserted ${insertedD1.length} Domain 1 lessons with full content.`);
  for (const l of insertedD1) {
    console.log(`    L${l.lesson_order}: ${l.title}`);
  }

  // Step 4: Insert placeholder lessons for domains 2-5
  console.log('\n5. Inserting placeholder lessons (Domains 2-5)...');
  const phLessons = placeholderLessons(moduleIdMap);
  const { data: insertedPh, error: phErr } = await sb
    .from('study_lessons')
    .insert(phLessons)
    .select('id, title');

  if (phErr) {
    console.error('  FATAL: Failed to insert placeholder lessons:', phErr.message);
    process.exit(1);
  }
  console.log(`  Inserted ${insertedPh.length} placeholder lessons.`);

  // Summary
  console.log('\n=== Import Complete ===');
  console.log(`Modules: ${insertedModules.length} (across 5 domains)`);
  console.log(`Domain 1 lessons (full content): ${insertedD1.length}`);
  console.log(`Placeholder lessons (Domains 2-5): ${insertedPh.length}`);
  console.log(`Total lessons: ${insertedD1.length + insertedPh.length}`);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

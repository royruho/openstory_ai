import { useState, useEffect, useRef, useCallback } from "react";
import { api, saveUserKey, clearUserKey, hasUserKey, FREE_TURN_LIMIT } from "./api.js";

// ─── TRANSLATIONS ───────────────────────────────────────────────
const TR = {
  adventureAwaits:  { English: "Adventure Awaits", Hebrew: "ההרפתקה מחכה", Arabic: "تنتظرك مغامرة", Portuguese: "A Aventura Aguarda" },
  stepOf:           { English: "Step {c} of {t}", Hebrew: "שלב {c} מתוך {t}", Arabic: "الخطوة {c} من {t}", Portuguese: "Etapa {c} de {t}" },
  chooseWorld:      { English: "Choose Your World", Hebrew: "בחר את העולם שלך", Arabic: "اختر عالمك", Portuguese: "Escolha seu Mundo" },
  chooseWorldSub:   { English: "Select the genre for your adventure", Hebrew: "בחר את הז'אנר להרפתקה שלך", Arabic: "حدد النوع لمغامرتك", Portuguese: "Selecione o gênero da sua aventura" },
  language:         { English: "Language", Hebrew: "שפה", Arabic: "اللغة", Portuguese: "Idioma" },
  languageSub:      { English: "Choose the language for your adventure", Hebrew: "בחר את השפה להרפתקה שלך", Arabic: "اختر لغة مغامرتك", Portuguese: "Escolha o idioma da sua aventura" },
  contentRating:    { English: "Content Rating", Hebrew: "דירוג תוכן", Arabic: "تصنيف المحتوى", Portuguese: "Classificação de Conteúdo" },
  contentRatingSub: { English: "Set appropriate content levels", Hebrew: "הגדר רמות תוכן מתאימות", Arabic: "حدد مستويات المحتوى المناسبة", Portuguese: "Defina os níveis apropriados de conteúdo" },
  kids:             { English: "Kids (8+)", Hebrew: "ילדים (8+)", Arabic: "أطفال (8+)", Portuguese: "Crianças (8+)" },
  kidsSub:          { English: "Light-hearted, no violence or romance, simple vocabulary", Hebrew: "קליל, ללא אלימות או רומנטיקה, אוצר מילים פשוט", Arabic: "خفيف، بدون عنف أو رومانسية، مفردات بسيطة", Portuguese: "Leve, sem violência nem romance, vocabulário simples" },
  teen:             { English: "Teen (13+)", Hebrew: "נוער (13+)", Arabic: "مراهقون (13+)", Portuguese: "Adolescente (13+)" },
  teenSub:          { English: "Moderate action, light tension, engaging vocabulary", Hebrew: "אקשן מתון, מתח קל, אוצר מילים מרתק", Arabic: "حركة متوسطة، توتر خفيف، مفردات جذابة", Portuguese: "Ação moderada, tensão leve, vocabulário envolvente" },
  adult:            { English: "Adult (18+)", Hebrew: "מבוגרים (18+)", Arabic: "بالغون (18+)", Portuguese: "Adulto (18+)" },
  adultSub:         { English: "Full range of themes, vivid descriptions, mature content", Hebrew: "מגוון נושאים מלא, תיאורים חיים, תוכן בוגר", Arabic: "مجموعة كاملة من المواضيع، أوصاف حية، محتوى ناضج", Portuguese: "Temas completos, descrições vívidas, conteúdo adulto" },
  storyDuration:    { English: "Adventure Length", Hebrew: "אורך ההרפתקה", Arabic: "طول المغامرة", Portuguese: "Duração da Aventura" },
  storyDurationSub: { English: "How many chapters should the adventure last?", Hebrew: "כמה פרקים תימשך ההרפתקה?", Arabic: "كم عدد الفصول التي ستستغرقها المغامرة؟", Portuguese: "Quantos capítulos durará a aventura?" },
  perspective:      { English: "Narrative Perspective", Hebrew: "נקודת מבט", Arabic: "منظور السرد", Portuguese: "Perspectiva Narrativa" },
  perspectiveSub:   { English: "How should the story refer to you?", Hebrew: "איך הסיפור יתייחס אליך?", Arabic: "كيف يجب أن تشير القصة إليك؟", Portuguese: "Como a história deve se referir a você?" },
  firstPerson:      { English: "First Person", Hebrew: "גוף ראשון", Arabic: "ضمير المتكلم", Portuguese: "Primeira Pessoa" },
  firstPersonEx:    { English: "\"I drew my sword and stepped into the dark\"", Hebrew: "\"שלפתי את חרבי וצעדתי אל החושך\"", Arabic: "\"سللت سيفي وخطوت إلى الظلام\"", Portuguese: "\"Desembainhei minha espada e avancei para a escuridão\"" },
  secondPerson:     { English: "Second Person", Hebrew: "גוף שני", Arabic: "ضمير المخاطب", Portuguese: "Segunda Pessoa" },
  secondPersonEx:   { English: "\"You draw your sword and step into the dark\"", Hebrew: "\"אתה שולף את חרבך וצועד אל החושך\"", Arabic: "\"تسلّ سيفك وتخطو نحو الظلام\"", Portuguese: "\"Você desembainha sua espada e avança para a escuridão\"" },
  storyPacing:      { English: "Story Pacing", Hebrew: "קצב הסיפור", Arabic: "إيقاع القصة", Portuguese: "Ritmo da História" },
  storyPacingSub:   { English: "How detailed should each story beat be?", Hebrew: "כמה מפורט יהיה כל חלק בסיפור?", Arabic: "ما مدى تفصيل كل جزء من القصة؟", Portuguese: "Quão detalhado deve ser cada trecho da história?" },
  short:            { English: "Quick & Punchy", Hebrew: "מהיר וקצר", Arabic: "سريع ومختصر", Portuguese: "Rápido e Direto" },
  shortSub:         { English: "1-2 sentences per beat — fast-paced action", Hebrew: "1-2 משפטים — קצב מהיר", Arabic: "1-2 جملة لكل جزء — حركة سريعة", Portuguese: "1-2 frases por trecho — ação acelerada" },
  medium:           { English: "Balanced", Hebrew: "מאוזן", Arabic: "متوازن", Portuguese: "Equilibrado" },
  mediumSub:        { English: "A paragraph per beat — good mix of action and description", Hebrew: "פסקה אחת — שילוב טוב של אקשן ותיאור", Arabic: "فقرة واحدة لكل جزء — مزيج جيد من الحركة والوصف", Portuguese: "Um parágrafo por trecho — boa mistura de ação e descrição" },
  long:             { English: "Rich & Immersive", Hebrew: "עשיר וסוחף", Arabic: "غني وغامر", Portuguese: "Rico e Imersivo" },
  longSub:          { English: "2-3 paragraphs per beat — deep atmospheric storytelling", Hebrew: "2-3 פסקאות — סיפור אטמוספרי עמוק", Arabic: "2-3 فقرات لكل جزء — سرد أجواء عميق", Portuguese: "2-3 parágrafos por trecho — narrativa atmosférica e profunda" },
  gameRules:        { English: "Game Rules", Hebrew: "חוקי המשחק", Arabic: "قواعد اللعبة", Portuguese: "Regras do Jogo" },
  gameRulesSub:     { English: "Configure how your adventure plays out", Hebrew: "הגדר איך ההרפתקה שלך תתנהל", Arabic: "حدد كيف ستسير مغامرتك", Portuguese: "Configure como sua aventura será jogada" },
  canDie:           { English: "Can your character die?", Hebrew: "האם הדמות שלך יכולה למות?", Arabic: "هل يمكن أن تموت شخصيتك؟", Portuguese: "Seu personagem pode morrer?" },
  yesDeath:         { English: "Yes, risk of death", Hebrew: "כן, סיכון למוות", Arabic: "نعم، خطر الموت", Portuguese: "Sim, risco de morte" },
  noDeath:          { English: "No, always continue", Hebrew: "לא, תמיד להמשיך", Arabic: "لا، الاستمرار دائماً", Portuguese: "Não, sempre continuar" },
  trackStatsQ:      { English: "Track stats (health, inventory)?", Hebrew: "לעקוב אחר נתונים (בריאות, מלאי)?", Arabic: "تتبع الإحصائيات (الصحة، المخزون)؟", Portuguese: "Acompanhar stats (vida, inventário)?" },
  yesStats:         { English: "Yes, track stats", Hebrew: "כן, לעקוב", Arabic: "نعم، التتبع", Portuguese: "Sim, acompanhar" },
  noStats:          { English: "No, pure narrative", Hebrew: "לא, סיפור בלבד", Arabic: "لا، سرد فقط", Portuguese: "Não, apenas narrativa" },
  storySeed:        { English: "Story Seed", Hebrew: "זרע הסיפור", Arabic: "بذرة القصة", Portuguese: "Semente da História" },
  storySeedSub:     { English: "Optionally describe a setting, scenario, or theme (or leave blank for a surprise)", Hebrew: "תאר סביבה, תרחיש או נושא (או השאר ריק להפתעה)", Arabic: "اختيارياً صف بيئة أو سيناريو أو موضوعاً (أو اتركه فارغاً للمفاجأة)", Portuguese: "Opcionalmente descreva um cenário, situação ou tema (ou deixe em branco para uma surpresa)" },
  storySeedPH:      { English: "e.g. 'A haunted space station orbiting a dying star...'", Hebrew: "למשל: 'תחנת חלל רדופה סביב כוכב גוסס...'", Arabic: "مثال: 'محطة فضائية مسكونة تدور حول نجم محتضر...'", Portuguese: "ex: 'Uma estação espacial assombrada orbitando uma estrela moribunda...'" },
  createChar:       { English: "Create Your Character", Hebrew: "צור את הדמות שלך", Arabic: "أنشئ شخصيتك", Portuguese: "Crie seu Personagem" },
  createCharSub:    { English: "Who are you in this story?", Hebrew: "מי אתה בסיפור הזה?", Arabic: "من أنت في هذه القصة؟", Portuguese: "Quem é você nesta história?" },
  name:             { English: "Name", Hebrew: "שם", Arabic: "الاسم", Portuguese: "Nome" },
  namePH:           { English: "Your character's name", Hebrew: "שם הדמות שלך", Arabic: "اسم شخصيتك", Portuguese: "Nome do seu personagem" },
  age:              { English: "Age", Hebrew: "גיל", Arabic: "العمر", Portuguese: "Idade" },
  agePH:            { English: "e.g. 28", Hebrew: "למשל 28", Arabic: "مثال: 28", Portuguese: "ex: 28" },
  gender:           { English: "Gender", Hebrew: "מגדר", Arabic: "الجنس", Portuguese: "Gênero" },
  male:             { English: "Male", Hebrew: "זכר", Arabic: "ذكر", Portuguese: "Masculino" },
  female:           { English: "Female", Hebrew: "נקבה", Arabic: "أنثى", Portuguese: "Feminino" },
  nonBinary:        { English: "Non-binary", Hebrew: "לא בינארי", Arabic: "غير ثنائي", Portuguese: "Não-binário" },
  other:            { English: "Other", Hebrew: "אחר", Arabic: "آخر", Portuguese: "Outro" },
  appearance:       { English: "Appearance", Hebrew: "מראה", Arabic: "المظهر", Portuguese: "Aparência" },
  appearancePH:     { English: "Describe your character's look...", Hebrew: "תאר את המראה של הדמות שלך...", Arabic: "صف مظهر شخصيتك...", Portuguese: "Descreva a aparência do seu personagem..." },
  skills:           { English: "Skills", Hebrew: "כישורים", Arabic: "المهارات", Portuguese: "Habilidades" },
  skillsSub:        { English: "(pick up to 3)", Hebrew: "(בחר עד 3)", Arabic: "(اختر حتى 3)", Portuguese: "(escolha até 3)" },
  beginAdventure:   { English: "Begin Adventure", Hebrew: "התחל הרפתקה", Arabic: "ابدأ المغامرة", Portuguese: "Começar Aventura" },
  continue_:        { English: "Continue", Hebrew: "המשך", Arabic: "متابعة", Portuguese: "Continuar" },
  back:             { English: "← Back", Hebrew: "חזרה →", Arabic: "رجوع →", Portuguese: "← Voltar" },
  homeBack:         { English: "← Home", Hebrew: "בית →",  Arabic: "الرئيسية →", Portuguese: "← Início" },
  whatDoYouDo:      { English: "What do you do?", Hebrew: "מה אתה עושה?", Arabic: "ماذا تفعل؟", Portuguese: "O que você faz?" },
  typeAction:       { English: "Write your action...", Hebrew: "כתוב את הפעולה שלך...", Arabic: "اكتب فعلك...", Portuguese: "Escreva sua ação..." },
  orChoose:         { English: "or pick a suggestion", Hebrew: "או בחר הצעה", Arabic: "أو اختر اقتراحاً", Portuguese: "ou escolha uma sugestão" },
  go:               { English: "Go", Hebrew: "קדימה", Arabic: "انطلق", Portuguese: "Ir" },
  stats:            { English: "Stats", Hebrew: "נתונים", Arabic: "الإحصائيات", Portuguese: "Status" },
  health:           { English: "Health", Hebrew: "בריאות", Arabic: "الصحة", Portuguese: "Vida" },
  inventory:        { English: "Inventory", Hebrew: "מלאי", Arabic: "المخزون", Portuguese: "Inventário" },
  relationships:    { English: "Relationships", Hebrew: "יחסים", Arabic: "العلاقات", Portuguese: "Relações" },
  adventureOver:    { English: "Adventure Over", Hebrew: "ההרפתקה הסתיימה", Arabic: "انتهت المغامرة", Portuguese: "Aventura Encerrada" },
  newAdventure:     { English: "New Adventure", Hebrew: "הרפתקה חדשה", Arabic: "مغامرة جديدة", Portuguese: "Nova Aventura" },
  storyUnfolds:     { English: "The story unfolds...", Hebrew: "הסיפור מתגלה...", Arabic: "القصة تتكشف...", Portuguese: "A história se desenrola..." },
  retryHighDemand:  { English: "The model is under heavy load — retrying…", Hebrew: "המודל בעומס גבוה — מנסה שוב…", Arabic: "النموذج تحت ضغط عالٍ — جاري المحاولة مرة أخرى…", Portuguese: "O modelo está com alta demanda — a tentar novamente…" },
  retryFallback:    { English: "Switching to a backup model…", Hebrew: "מעבר למודל גיבוי…", Arabic: "التبديل إلى نموذج احتياطي…", Portuguese: "A mudar para um modelo alternativo…" },
  turn:             { English: "Turn", Hebrew: "תור", Arabic: "الدورة", Portuguese: "Turno" },
  sAdventure:       { English: "'s Adventure", Hebrew: " - הרפתקה", Arabic: " - مغامرة", Portuguese: " - Aventura" },
  exportStory:      { English: "Export Story", Hebrew: "ייצא סיפור", Arabic: "تصدير القصة", Portuguese: "Exportar História" },
  saveGame:         { English: "Save Game", Hebrew: "שמור משחק", Arabic: "حفظ اللعبة", Portuguese: "Salvar Jogo" },
  loadGame:         { English: "Load Game", Hebrew: "טען משחק", Arabic: "تحميل اللعبة", Portuguese: "Carregar Jogo" },
  loadGameSub:      { English: "Resume a saved adventure", Hebrew: "המשך הרפתקה שמורה", Arabic: "استأنف مغامرة محفوظة", Portuguese: "Retomar uma aventura salva" },
  loadError:        { English: "Could not load save file — file may be corrupted.", Hebrew: "לא ניתן לטעון את קובץ השמירה — הקובץ עלול להיות פגום.", Arabic: "لا يمكن تحميل ملف الحفظ — قد يكون الملف تالفاً.", Portuguese: "Não foi possível carregar o ficheiro de gravação — pode estar corrompido." },
  fantasy:          { English: "Fantasy", Hebrew: "פנטזיה", Arabic: "فانتازيا", Portuguese: "Fantasia" },
  scifi:            { English: "Sci-Fi", Hebrew: "מדע בדיוני", Arabic: "خيال علمي", Portuguese: "Ficção Científica" },
  reality:          { English: "Reality", Hebrew: "מציאות", Arabic: "واقع", Portuguese: "Realidade" },
  mystery:          { English: "Mystery", Hebrew: "מסתורין", Arabic: "غموض", Portuguese: "Mistério" },
  // ── Dice & chapters ──
  chapterLabel:     { English: "Chapter", Hebrew: "פרק", Arabic: "الفصل", Portuguese: "Capítulo" },
  of:               { English: "of", Hebrew: "מתוך", Arabic: "من", Portuguese: "de" },
  fateCheck:        { English: "Fate check required:", Hebrew: "נדרשת בדיקת גורל:", Arabic: "فحص القدر مطلوب:", Portuguese: "Verificação do destino necessária:" },
  rollBtn:          { English: "Roll the Dice!", Hebrew: "הטל קוביה!", Arabic: "ارمِ النرد!", Portuguese: "Jogue os Dados!" },
  rollingAnim:      { English: "Rolling...", Hebrew: "מטיל...", Arabic: "جارٍ الرمي...", Portuguese: "Rolando..." },
  continueAfterRoll:{ English: "Continue →", Hebrew: "← המשך", Arabic: "← متابعة", Portuguese: "Continuar →" },
  critFail:         { English: "Critical Failure", Hebrew: "כישלון חרוץ", Arabic: "فشل ذريع", Portuguese: "Falha Crítica" },
  minorFail:        { English: "Setback", Hebrew: "מכשול", Arabic: "انتكاسة", Portuguese: "Contratempo" },
  partSuccess:      { English: "Partial Success", Hebrew: "הצלחה חלקית", Arabic: "نجاح جزئي", Portuguese: "Sucesso Parcial" },
  critSuccess:      { English: "Critical Success!", Hebrew: "הצלחה מוחלטת!", Arabic: "نجاح استثنائي!", Portuguese: "Sucesso Crítico!" },
  skillBonusApplied:{ English: "Skill Bonus — rolled twice, kept highest", Hebrew: "בונוס כישור — הוטל פעמיים, נשמר הגבוה", Arabic: "مكافأة مهارة — رُمي مرتين واحتُفظ بالأعلى", Portuguese: "Bónus de Habilidade — lançado duas vezes, mantido o mais alto" },
  rollRequired:     { English: "Next action may require a fate check", Hebrew: "הפעולה הבאה עשויה לדרוש בדיקת גורל", Arabic: "قد يتطلب الفعل التالي فحص قدر", Portuguese: "A próxima ação pode exigir uma verificação do destino" },
  // ── Key modal (shown at turn 20) ──
  keyModalTitle:    { English: "Continue Your Adventure", Hebrew: "המשך את ההרפתקה שלך", Arabic: "تابع مغامرتك", Portuguese: "Continue sua Aventura" },
  keyModalSub:      { English: "You've used your 20 free turns. To keep playing, add your own OpenRouter API key with a small credit balance — about $0.0002 per turn.", Hebrew: "השתמשת ב-20 התורות החינמיים. כדי להמשיך, הוסף מפתח OpenRouter משלך עם יתרת אשראי קטנה — כ-‎$0.0002 לכל תור.", Arabic: "لقد استخدمت 20 دورة مجانية. للمتابعة، أضف مفتاح OpenRouter الخاص بك برصيد صغير — حوالي ‎$0.0002 لكل دورة.", Portuguese: "Você usou seus 20 turnos gratuitos. Para continuar, adicione sua própria chave da OpenRouter com um pequeno saldo — cerca de ‎$0.0002 por turno." },
  keyPlaceholder:   { English: "Paste your OpenRouter key (starts with sk-or-...)", Hebrew: "הדבק את מפתח ה-OpenRouter (מתחיל ב-sk-or-...)", Arabic: "الصق مفتاح OpenRouter (يبدأ بـ sk-or-...)", Portuguese: "Cole sua chave OpenRouter (começa com sk-or-...)" },
  keyValidate:      { English: "Validate & Continue", Hebrew: "אמת והמשך", Arabic: "تحقق وتابع", Portuguese: "Validar e Continuar" },
  keyValidating:    { English: "Validating...", Hebrew: "מאמת...", Arabic: "جارٍ التحقق...", Portuguese: "Validando..." },
  keyHowTo:         { English: "How to set up your own key (cheapest route)", Hebrew: "איך להגדיר מפתח משלך (הזול ביותר)", Arabic: "كيف تُعدّ مفتاحك الخاص (الأرخص)", Portuguese: "Como configurar sua chave (mais barato)" },
  keyStep1:         { English: "Sign up at openrouter.ai — free, no card needed to register", Hebrew: "הירשם ב-openrouter.ai — חינם, ללא צורך בכרטיס אשראי להרשמה", Arabic: "سجّل في openrouter.ai — مجاني، بدون بطاقة للتسجيل", Portuguese: "Registe-se em openrouter.ai — gratuito, sem cartão necessário para o registo" },
  keyStep2:         { English: "Open Credits and top up once (even $5 covers many thousands of turns)", Hebrew: "פתח Credits ובצע טעינה חד-פעמית (אפילו ‎$5 מספיקים לאלפי תורות)", Arabic: "افتح Credits واشحن مرة واحدة (حتى ‎$5 تغطي آلاف الدورات)", Portuguese: "Abra Credits e adicione crédito uma vez (até ‎$5 cobre milhares de turnos)" },
  keyStep3:         { English: "Open Keys → Create Key, copy it (sk-or-...), and paste above", Hebrew: "פתח Keys ← Create Key, העתק את המפתח (sk-or-...) והדבק למעלה", Arabic: "افتح Keys ← Create Key، انسخه (sk-or-...) والصقه أعلاه", Portuguese: "Abra Keys → Create Key, copie (sk-or-...) e cole acima" },
  keyStep4:         { English: "The app uses Google Gemini 2.0 Flash — paid but among the cheapest models ($0.10/M input, $0.40/M output). Free-tier OpenRouter models are too rate-limited for smooth play.", Hebrew: "האפליקציה משתמשת ב-Google Gemini 2.0 Flash — בתשלום אך מהמודלים הזולים ביותר (‎$0.10 למיליון קלט, ‎$0.40 למיליון פלט). מודלי חינם ב-OpenRouter מוגבלים מדי בקצב לשימוש שוטף.", Arabic: "يستخدم التطبيق Google Gemini 2.0 Flash — مدفوع لكنه من أرخص النماذج (‎$0.10 لكل مليون إدخال، ‎$0.40 لكل مليون إخراج). النماذج المجانية في OpenRouter مقيّدة بسرعة لا تناسب اللعب السلس.", Portuguese: "O app usa Google Gemini 2.0 Flash — pago mas entre os modelos mais baratos (‎$0.10/M entrada, ‎$0.40/M saída). Modelos gratuitos da OpenRouter têm limite de taxa muito restrito para jogar com fluidez." },
  keyError:         { English: "Could not validate key", Hebrew: "לא ניתן לאמת את המפתח", Arabic: "تعذّر التحقق من المفتاح", Portuguese: "Não foi possível validar a chave" },
  changeKey:        { English: "Change API key", Hebrew: "שנה מפתח API", Arabic: "تغيير مفتاح API", Portuguese: "Alterar chave API" },
  freeTurnsLeft:    { English: "{n} free turns remaining", Hebrew: "נשארו {n} תורות חינמיים", Arabic: "تبقّى {n} دورة مجانية", Portuguese: "{n} turnos gratuitos restantes" },
  // ── Home screen ──
  brandName:        { English: "OpenStory AI", Hebrew: "OpenStory AI", Arabic: "OpenStory AI", Portuguese: "OpenStory AI" },
  homeTitle:        { English: "Become the author of your own story", Hebrew: "הפוך למחבר הסיפור שלך", Arabic: "كن مؤلف قصتك الخاصة", Portuguese: "Torne-se o autor da sua própria história" },
  homeTagline: {
    English:    "Have you ever dreamed of an intriguing idea you've always wanted to read? Or do you simply feel like embarking on a surprising and immersive adventure? This app is the place for you.",
    Hebrew:     "חלמתם פעם על רעיון מסקרן שתמיד רציתם לקרוא? או שפשוט מתחשק לכם לצאת להרפתקה מפתיעה וסוחפת? האפליקציה הזו היא המקום בשבילכם.",
    Arabic:     "هل حلمت يوماً بفكرة مثيرة لطالما رغبت في قراءتها؟ أم أنك ببساطة تشعر بالرغبة في خوض مغامرة روائية مدهشة وغامرة؟ هذا التطبيق هو مكانك الأمثل.",
    Portuguese: "Já sonhou com uma ideia intrigante que sempre quis ler? Ou simplesmente apetece-lhe embarcar numa aventura surpreendente e envolvente? Esta aplicação é o lugar ideal para si.",
  },
  pitchExplainer: {
    English:    "Here, you are the author: create worlds, design heroes, and fine-tune the plot style — or simply jump into a mysterious world generated for you. In this journey, you are the navigator: you hold the pen, and every choice you make becomes a story.",
    Hebrew:     "כאן אתם הסופרים: בראו עולמות, עצבו גיבורים ודייקו את סגנון העלילה – או פשוט קפצו לעולם מסתורי שהאפליקציה תגריל עבורכם. במסע הזה אתם המנווטים: אתם מחזיקים בעט, וכל בחירה שלכם הופכת לסיפור.",
    Arabic:     "هنا، أنت الكاتب: ابنِ عوالمك، صمّم أبطالك، ودقّق أسلوب الرواية – أو اقفز ببساطة إلى عالم غامض يختاره التطبيق لك. في هذه الرحلة، أنت القبطان: القلم بين يديك، وكل خيار تتخذه يصبح قصة.",
    Portuguese: "Aqui, o autor é você: crie mundos, desenhe heróis e ajuste o estilo da narrativa – ou simplesmente salte para um mundo misterioso gerado para si. Nesta viagem, você é o navegador: tem a caneta na mão, e cada escolha sua torna-se uma história.",
  },
  homeBullet1:      { English: "Pick your genre, set the rules, design your hero.", Hebrew: "בחר ז'אנר, קבע חוקים, עצב את הגיבור שלך.", Arabic: "اختر النوع، اضبط القواعد، صمّم بطلك.", Portuguese: "Escolha o gênero, defina as regras, crie seu herói." },
  homeBullet2:      { English: "AI narrates a living world that reacts to you.", Hebrew: "בינה מלאכותית מספרת עולם חי שמגיב אליך.", Arabic: "الذكاء الاصطناعي يسرد عالماً حياً يتفاعل معك.", Portuguese: "A IA narra um mundo vivo que reage às suas ações." },
  homeBullet3:      { English: "Dice rolls, chapters, and real consequences.", Hebrew: "הטלת קוביות, פרקים והשלכות אמיתיות.", Arabic: "رمي النرد، فصول، وعواقب حقيقية.", Portuguese: "Rolagens de dados, capítulos e consequências reais." },
  startNew:         { English: "Start New Adventure", Hebrew: "התחל הרפתקה חדשה", Arabic: "ابدأ مغامرة جديدة", Portuguese: "Iniciar Nova Aventura" },
  loadSaved:        { English: "Load Saved Adventure", Hebrew: "טען הרפתקה שמורה", Arabic: "تحميل مغامرة محفوظة", Portuguese: "Carregar Aventura Salva" },
  loadSavedSub:     { English: "Resume from a .json save file", Hebrew: "המשך מקובץ שמירה .json", Arabic: "استئناف من ملف حفظ .json", Portuguese: "Retomar a partir de um ficheiro .json" },
  versionError:     { English: "This save file was created with an incompatible version of the app and cannot be loaded.", Hebrew: "קובץ השמירה נוצר עם גרסה לא תואמת של האפליקציה ולא ניתן לטעון אותו.", Arabic: "تم إنشاء ملف الحفظ هذا بإصدار غير متوافق من التطبيق ولا يمكن تحميله.", Portuguese: "Este ficheiro de gravação foi criado com uma versão incompatível da aplicação e não pode ser carregado." },
  quitGame:         { English: "Quit Game", Hebrew: "עזוב משחק", Arabic: "إنهاء اللعبة", Portuguese: "Sair do Jogo" },
  addYourKey:       { English: "Add Your Key", Hebrew: "הוסף מפתח", Arabic: "أضف مفتاحك", Portuguese: "Adicionar Chave" },
  unlimitedTurns:   { English: "Unlimited turns", Hebrew: "תורות ללא הגבלה", Arabic: "دورات غير محدودة", Portuguese: "Turnos ilimitados" },
  freeTurnsInfo:    { English: "{n} free turns included · no sign-up needed", Hebrew: "{n} תורות חינמיים כלולים · ללא הרשמה", Arabic: "يشمل {n} دورات مجانية · لا حاجة للتسجيل", Portuguese: "{n} turnos gratuitos inclusos · sem cadastro" },
  keyModalSubHome:  { English: "Play unlimited turns with your own OpenRouter API key. Setup takes 2 minutes — a small top-up (even $5) lasts many thousands of turns.", Hebrew: "שחק תורות ללא הגבלה עם מפתח OpenRouter משלך. ההגדרה לוקחת 2 דקות — טעינה קטנה (אפילו ‎$5) מספיקה לאלפי תורות.", Arabic: "العب دورات غير محدودة بمفتاح OpenRouter الخاص بك. الإعداد يستغرق دقيقتين — شحن صغير (حتى ‎$5) يدوم لآلاف الدورات.", Portuguese: "Jogue turnos ilimitados com sua própria chave OpenRouter. Configuração leva 2 minutos — uma pequena recarga (até ‎$5) dura milhares de turnos." },
  turnsLeft:        { English: "{n} free turns left", Hebrew: "נשארו {n} תורות חינמיים", Arabic: "تبقّى {n} دورات مجانية", Portuguese: "{n} turnos gratuitos restantes" },
  suggestedNames:   { English: "Suggested names", Hebrew: "שמות מוצעים", Arabic: "أسماء مقترحة", Portuguese: "Nomes sugeridos" },
  optional_:        { English: "optional", Hebrew: "אופציונלי", Arabic: "اختياري", Portuguese: "opcional" },
  // ── Help ──
  help:             { English: "Help", Hebrew: "עזרה", Arabic: "مساعدة", Portuguese: "Ajuda" },
  helpTitle:        { English: "How OpenStory AI works", Hebrew: "איך OpenStory AI עובד", Arabic: "كيف يعمل OpenStory AI", Portuguese: "Como o OpenStory AI funciona" },
  helpClose:        { English: "Close", Hebrew: "סגור", Arabic: "إغلاق", Portuguese: "Fechar" },
  helpWhatIs:       { English: "What is OpenStory AI?", Hebrew: "מה זה OpenStory AI?", Arabic: "ما هو OpenStory AI؟", Portuguese: "O que é o OpenStory AI?" },
  helpWhatIsBody:   { English: "An AI-powered interactive fiction engine. You set the world, the rules, and your character — then an AI narrator tells the story one turn at a time, reacting to every choice you make.", Hebrew: "מנוע סיפור אינטראקטיבי מבוסס בינה מלאכותית. אתה קובע את העולם, את החוקים ואת הדמות שלך — ואז מספר ה-AI מספר את הסיפור תור אחר תור, מגיב לכל בחירה שלך.", Arabic: "محرك قصص تفاعلية مدعوم بالذكاء الاصطناعي. أنت تحدد العالم والقواعد وشخصيتك — ثم يروي الراوي الذكي القصة دوراً بعد دور، ويتفاعل مع كل اختيار تصنعه.", Portuguese: "Um motor de ficção interativa com IA. Você define o mundo, as regras e o personagem — então um narrador de IA conta a história turno a turno, reagindo a cada escolha sua." },
  helpHowTo:        { English: "How to play", Hebrew: "איך לשחק", Arabic: "كيف تلعب", Portuguese: "Como jogar" },
  helpHowTo1:       { English: "Click Start New Adventure and walk through the setup — choose a language, genre, age rating, pacing, length, and rules.", Hebrew: "לחץ על 'התחל הרפתקה חדשה' ועבור על ההגדרות — בחר שפה, ז'אנר, דירוג גיל, קצב, אורך וחוקים.", Arabic: "انقر على 'ابدأ مغامرة جديدة' واتبع خطوات الإعداد — اختر اللغة والنوع والتصنيف العمري والإيقاع والطول والقواعد.", Portuguese: "Clique em Iniciar Nova Aventura e siga a configuração — escolha idioma, gênero, classificação, ritmo, duração e regras." },
  helpHowTo2:       { English: "Design your character: name, age, appearance, and up to 3 skills. Any field can be left blank — we'll fill it in.", Hebrew: "עצב את הדמות שלך: שם, גיל, מראה ועד 3 כישורים. ניתן להשאיר כל שדה ריק — אנחנו נמלא.", Arabic: "صمّم شخصيتك: الاسم والعمر والمظهر وحتى 3 مهارات. يمكن ترك أي حقل فارغاً — سنملؤه.", Portuguese: "Crie seu personagem: nome, idade, aparência e até 3 habilidades. Qualquer campo pode ficar em branco — nós preenchemos." },
  helpHowTo3:       { English: "When the story begins, type your own action or pick from the suggestions. The AI responds in kind.", Hebrew: "כשהסיפור מתחיל, הקלד פעולה משלך או בחר מההצעות. ה-AI מגיב בהתאם.", Arabic: "عندما تبدأ القصة، اكتب فعلك الخاص أو اختر من الاقتراحات. يستجيب الذكاء الاصطناعي وفقاً لذلك.", Portuguese: "Quando a história começar, digite sua própria ação ou escolha entre as sugestões. A IA responde em conformidade." },
  helpDice:         { English: "Dice & fate checks", Hebrew: "קוביות ובדיקות גורל", Arabic: "النرد وفحوص القدر", Portuguese: "Dados e verificações do destino" },
  helpDiceBody:     { English: "Risky actions trigger a dice roll. A 1 is a critical failure; a 6 is a critical success. If the action matches one of your skills, you roll twice and keep the better result.", Hebrew: "פעולות מסוכנות מפעילות הטלת קובייה. 1 הוא כישלון חרוץ; 6 הוא הצלחה מוחלטת. אם הפעולה תואמת אחד מהכישורים שלך, אתה מטיל פעמיים ושומר על התוצאה הטובה יותר.", Arabic: "الأفعال الخطرة تستدعي رمي النرد. 1 هو فشل ذريع؛ 6 هو نجاح استثنائي. إذا تطابق الفعل مع إحدى مهاراتك، ترمي مرتين وتحتفظ بالنتيجة الأفضل.", Portuguese: "Ações arriscadas acionam uma rolagem de dado. 1 é falha crítica; 6 é sucesso crítico. Se a ação corresponder a uma de suas habilidades, você rola duas vezes e mantém o melhor resultado." },
  helpLearn:        { English: "Learn a language as you play", Hebrew: "למד שפה תוך כדי משחק", Arabic: "تعلّم لغة أثناء اللعب", Portuguese: "Aprenda um idioma enquanto joga" },
  helpLearnBody:    {
    English:    "An optional educational mode. On the home screen pick your interface language and a second language under 'Learn' — then every narrator paragraph becomes a study tool with three modes: (1) Tap any word to see its meaning in a small popover (uses surrounding context for accuracy). (2) Long-press a paragraph (or click 'Gloss all words') to translate every word at once — afterwards each word shows a faint underline so you can tell which are pre-loaded. (3) Click 'Translate' for the full paragraph as one block. Word translations are cached on your device, so the same word never costs an API call twice. Set Learn to 'Off' to hide the feature entirely.",
    Hebrew:     "מצב למידה אופציונלי. במסך הראשי בחר את שפת הממשק ושפה שנייה תחת 'למידה' — וכל פסקה של המספר הופכת לכלי לימוד עם שלושה מצבים: (1) הקש על כל מילה כדי לראות את משמעותה בחלון קטן (משתמש בהקשר הסביב לדיוק). (2) הקשה ארוכה על פסקה (או לחיצה על 'תרגם כל מילה') תתרגם את כל המילים בבת אחת — לאחר מכן כל מילה תופיע עם קו תחתי קל כדי לדעת אילו מילים נטענו מראש. (3) לחץ על 'תרגם' כדי לקבל את הפסקה כולה כגוש אחד. תרגומי המילים נשמרים במטמון במכשיר שלך, כך שאותה מילה לא תעלה קריאת API פעמיים. הגדר 'למידה' ל'כבוי' כדי להסתיר את התכונה לחלוטין.",
    Arabic:     "وضع تعليمي اختياري. في الشاشة الرئيسية اختر لغة الواجهة ولغة ثانية ضمن 'تعلّم' — وستصبح كل فقرة من الراوي أداة دراسة بثلاثة أوضاع: (1) اضغط على أي كلمة لرؤية معناها في نافذة صغيرة (يستخدم السياق المحيط للدقة). (2) اضغط مطوّلاً على فقرة (أو انقر 'ترجم كل الكلمات') لترجمة كل الكلمات دفعة واحدة — بعد ذلك ستظهر كل كلمة بخط تحتي خفيف لتعرف أيها تم تحميلها مسبقاً. (3) انقر 'ترجم' للحصول على الفقرة كاملة كجزء واحد. تُخزَّن ترجمات الكلمات في جهازك، فلا تكلّف الكلمة نفسها استدعاء API مرتين. اضبط 'تعلّم' على 'معطّل' لإخفاء الميزة تماماً.",
    Portuguese: "Um modo educacional opcional. No ecrã inicial escolha o idioma da interface e um segundo idioma em 'Aprender' — e cada parágrafo do narrador torna-se uma ferramenta de estudo com três modos: (1) Toque em qualquer palavra para ver o seu significado num pequeno popover (usa o contexto à volta para precisão). (2) Mantenha pressionado um parágrafo (ou clique em 'Glossar todas') para traduzir todas as palavras de uma vez — depois cada palavra ficará com um sublinhado ténue para sabermos quais foram pré-carregadas. (3) Clique em 'Traduzir' para o parágrafo inteiro como um bloco. As traduções de palavras ficam em cache no seu dispositivo, por isso a mesma palavra nunca custa duas chamadas à API. Defina 'Aprender' como 'Desativado' para ocultar totalmente a funcionalidade.",
  },
  helpChapters:     { English: "Chapters", Hebrew: "פרקים", Arabic: "الفصول", Portuguese: "Capítulos" },
  helpChaptersBody: { English: "Longer adventures split into chapters, each with one overarching goal. Explore freely — a chapter ends only when you conclusively achieve its goal.", Hebrew: "הרפתקאות ארוכות מתחלקות לפרקים, לכל אחד מטרה מרכזית אחת. חקור בחופשיות — פרק מסתיים רק כשאתה משיג את מטרתו באופן חד-משמעי.", Arabic: "المغامرات الأطول تنقسم إلى فصول، لكل فصل هدف رئيسي واحد. استكشف بحرية — ينتهي الفصل فقط عندما تحقق هدفه بشكل قاطع.", Portuguese: "Aventuras mais longas se dividem em capítulos, cada um com um objetivo central. Explore livremente — um capítulo só termina quando você alcança seu objetivo de forma conclusiva." },
  helpSaveLoad:     { English: "Save & Load", Hebrew: "שמירה וטעינה", Arabic: "الحفظ والتحميل", Portuguese: "Salvar e Carregar" },
  helpSaveLoadBody: { English: "Saves are .json files downloaded to your device. Nothing is stored on our servers. Load one from the home screen to continue exactly where you left off.", Hebrew: "השמירות הן קבצי .json שמורדים למכשיר שלך. שום דבר לא נשמר בשרתים שלנו. טען אחד מהמסך הראשי כדי להמשיך בדיוק מהמקום בו עצרת.", Arabic: "ملفات الحفظ هي ملفات .json يتم تنزيلها إلى جهازك. لا يتم تخزين أي شيء على خوادمنا. حمّل ملفاً من الشاشة الرئيسية لتستأنف من حيث توقفت تماماً.", Portuguese: "As gravações são ficheiros .json descarregados para o seu dispositivo. Nada é armazenado nos nossos servidores. Carregue um a partir do ecrã inicial para continuar exatamente onde ficou." },
  helpFreemium:     { English: "Free turns & your own key", Hebrew: "תורות חינמיים והמפתח שלך", Arabic: "الأدوار المجانية ومفتاحك الخاص", Portuguese: "Turnos gratuitos e sua chave" },
  helpFreemiumBody: { English: "The first 20 turns are on us — no sign-up, no key — paid for by the app. After that, you'll need your own OpenRouter API key with a small credit balance. The app uses Google Gemini 2.0 Flash, a paid but very cheap model (~$0.0002 per turn at $0.10/M input + $0.40/M output). A one-time top-up of even $5 covers many thousands of turns. OpenRouter's free-tier models exist, but their rate limits are too tight for smooth play — Gemini 2.0 Flash is the cheapest premium option.", Hebrew: "20 התורות הראשונים עלינו — ללא הרשמה, ללא מפתח — משולמים על ידי האפליקציה. לאחר מכן תצטרך מפתח OpenRouter משלך עם יתרת אשראי קטנה. האפליקציה משתמשת ב-Google Gemini 2.0 Flash, מודל בתשלום אך זול מאוד (כ-‎$0.0002 לכל תור, ‎$0.10 למיליון קלט + ‎$0.40 למיליון פלט). טעינה חד-פעמית של אפילו ‎$5 מכסה אלפי תורות. ל-OpenRouter יש מודלים חינמיים, אך קצבי השימוש שלהם מוגבלים מדי לשחק ברצף — Gemini 2.0 Flash הוא האפשרות הפרימיום הזולה ביותר.", Arabic: "الأدوار الـ20 الأولى على حسابنا — بدون تسجيل، بدون مفتاح — مدفوعة من التطبيق. بعد ذلك، ستحتاج إلى مفتاح OpenRouter API خاص بك مع رصيد صغير. يستخدم التطبيق Google Gemini 2.0 Flash، وهو نموذج مدفوع لكنه رخيص جداً (حوالي ‎$0.0002 لكل دورة، ‎$0.10 لكل مليون إدخال + ‎$0.40 لكل مليون إخراج). شحنة واحدة حتى ‎$5 تغطي آلاف الدورات. النماذج المجانية متاحة على OpenRouter، لكن حدود معدلها ضيقة جداً للعب السلس — Gemini 2.0 Flash هو الخيار المدفوع الأرخص.", Portuguese: "Os primeiros 20 turnos são por nossa conta — sem registo, sem chave — pagos pela aplicação. Depois disso, vai precisar da sua própria chave OpenRouter com um pequeno saldo. A aplicação utiliza o Google Gemini 2.0 Flash, um modelo pago mas muito barato (~‎$0.0002 por turno, ‎$0.10/M de entrada + ‎$0.40/M de saída). Um carregamento único de ‎$5 já chega para muitos milhares de turnos. A OpenRouter tem modelos gratuitos, mas os seus limites de utilização são demasiado apertados para jogar sem interrupções — o Gemini 2.0 Flash é a opção paga mais barata." },
  helpOpenRouter:   { English: "What is OpenRouter & how to get a key", Hebrew: "מה זה OpenRouter ואיך להשיג מפתח", Arabic: "ما هو OpenRouter وكيف تحصل على مفتاح", Portuguese: "O que é OpenRouter e como obter uma chave" },
  helpOpenRouterIntro: { English: "OpenRouter is a single gateway that lets apps like this one talk to dozens of AI models (Google Gemini, Anthropic Claude, OpenAI GPT, Meta Llama, and many more). You sign up once, add a little credit to your account, and create an API key — a long string that proves the AI calls belong to you and that you'll cover their cost.", Hebrew: "OpenRouter הוא שער מרכזי המאפשר לאפליקציות כמו זו לדבר עם עשרות מודלי AI (Google Gemini, Anthropic Claude, OpenAI GPT, Meta Llama ועוד רבים). נרשמים פעם אחת, מוסיפים מעט אשראי לחשבון ויוצרים מפתח API — מחרוזת ארוכה שמוכיחה שהקריאות שייכות לך ושאתה מכסה את עלותן.", Arabic: "OpenRouter هو بوابة واحدة تسمح لتطبيقات مثل هذا بالتواصل مع عشرات من نماذج الذكاء الاصطناعي (Google Gemini، Anthropic Claude، OpenAI GPT، Meta Llama، والمزيد). تسجّل مرة واحدة، تضيف رصيداً صغيراً إلى حسابك، وتنشئ مفتاح API — نص طويل يثبت أن طلبات الذكاء الاصطناعي تخصك وأنك ستغطي تكلفتها.", Portuguese: "O OpenRouter é um portal único que permite a aplicações como esta comunicar com dezenas de modelos de IA (Google Gemini, Anthropic Claude, OpenAI GPT, Meta Llama e muitos outros). Regista-se uma vez, adiciona um pouco de crédito à sua conta e cria uma chave API — uma sequência longa que prova que os pedidos à IA são seus e que é você que cobre o custo." },
  helpOpenRouterWhy: { English: "Why can't we just cover everyone's turns? Every AI response costs real money (a few hundredths of a cent per turn). We give each visitor 20 free turns as a taste, paid from a shared budget. If we covered unlimited turns for everyone, the budget would run out in a day and nobody could play. Your own key means only your adventures are billed to you — at $0.10/M input and $0.40/M output tokens (the Gemini 2.0 Flash rate), a $5 top-up lasts many thousands of turns.", Hebrew: "למה אנחנו לא מכסים תורות ללא הגבלה לכולם? כל תשובת AI עולה כסף אמיתי (שברי סנטים לכל תור). אנחנו נותנים לכל מבקר 20 תורות חינם מתקציב משותף. אם היינו מכסים תורות ללא הגבלה לכולם, התקציב היה נגמר ביום אחד ואף אחד לא היה יכול לשחק. מפתח משלך אומר שרק ההרפתקאות שלך מחויבות לך — בעלות של ‎$0.10 למיליון טוקני קלט ו-‎$0.40 למיליון טוקני פלט (התעריף של Gemini 2.0 Flash), טעינה של ‎$5 מחזיקה לאלפי תורות.", Arabic: "لماذا لا نغطي تلقائياً جميع الأدوار للجميع؟ كل استجابة من الذكاء الاصطناعي تكلّف أموالاً حقيقية (أجزاء من السنت لكل دور). نمنح كل زائر 20 دوراً مجانياً من ميزانية مشتركة. لو غطّينا دوراً غير محدود للجميع، لنفدت الميزانية في يوم واحد ولن يتمكن أحد من اللعب. مفتاحك الخاص يعني أن مغامراتك فقط تُحاسب عليك — بسعر ‎$0.10 لكل مليون رمز إدخال و‎$0.40 لكل مليون رمز إخراج (سعر Gemini 2.0 Flash)، شحنة ‎$5 تكفي لآلاف الأدوار.", Portuguese: "Porque é que não cobrimos turnos ilimitados para toda a gente? Cada resposta da IA custa dinheiro real (frações de cêntimo por turno). Damos a cada visitante 20 turnos gratuitos de um orçamento partilhado. Se cobríssemos turnos ilimitados para todos, o orçamento acabava num dia e ninguém podia jogar. A sua própria chave significa que só as suas aventuras lhe são cobradas — a ‎$0.10 por milhão de tokens de entrada e ‎$0.40 por milhão de saída (o preço do Gemini 2.0 Flash), um carregamento de ‎$5 chega para milhares de turnos." },
  helpOpenRouterSteps: { English: "Quick setup:", Hebrew: "הגדרה מהירה:", Arabic: "إعداد سريع:", Portuguese: "Configuração rápida:" },
  helpOpenRouterVisit: { English: "Open openrouter.ai", Hebrew: "פתח את openrouter.ai", Arabic: "افتح openrouter.ai", Portuguese: "Abrir openrouter.ai" },
  // ── Translate (inline section translation) ──
  translate:        { English: "Translate",      Hebrew: "תרגם",         Arabic: "ترجم",          Portuguese: "Traduzir" },
  translateTo:      { English: "Translate to…",  Hebrew: "תרגם ל…",      Arabic: "ترجم إلى…",     Portuguese: "Traduzir para…" },
  languageLabel:    { English: "Language",       Hebrew: "שפה",          Arabic: "اللغة",          Portuguese: "Idioma" },
  translateToLabel: { English: "Translate to",   Hebrew: "תרגם ל",       Arabic: "ترجم إلى",       Portuguese: "Traduzir para" },
  learnLangLabel:   { English: "Learn",          Hebrew: "למידה",         Arabic: "تعلّم",           Portuguese: "Aprender" },
  translateOff:     { English: "Off",            Hebrew: "כבוי",          Arabic: "معطّل",           Portuguese: "Desativado" },
  glossAll:         { English: "Gloss all words", Hebrew: "תרגם כל מילה",  Arabic: "ترجم كل الكلمات", Portuguese: "Glossar todas" },
  glossing:         { English: "Glossing…",       Hebrew: "מתרגם מילים…", Arabic: "جارٍ ترجمة الكلمات…", Portuguese: "A glossar…" },
  wordTranslating:  { English: "Translating…",    Hebrew: "מתרגם…",       Arabic: "جارٍ الترجمة…",      Portuguese: "A traduzir…" },
  wordError:        { English: "Lookup failed",   Hebrew: "החיפוש נכשל",  Arabic: "فشل البحث",          Portuguese: "Falha na pesquisa" },
  wordHint:         {
    English:    "Tap any word in the story to see its meaning. Long-press a paragraph to look up every word at once.",
    Hebrew:     "הקש על כל מילה בסיפור כדי לראות את משמעותה. הקשה ארוכה על פסקה תתרגם את כל המילים בבת אחת.",
    Arabic:     "اضغط على أي كلمة في القصة لمعرفة معناها. اضغط مطوّلاً على الفقرة لترجمة كل الكلمات دفعة واحدة.",
    Portuguese: "Toque em qualquer palavra da história para ver o seu significado. Mantenha pressionada uma frase para traduzir todas as palavras de uma vez.",
  },
  wordHintDismiss:  { English: "Got it",          Hebrew: "הבנתי",         Arabic: "تمام",               Portuguese: "Entendi" },

  // ── Setup wizard step strip (short labels) ──
  stepGenre:        { English: "Genre",           Hebrew: "ז'אנר",         Arabic: "النوع",              Portuguese: "Gênero" },
  stepRating:       { English: "Rating",          Hebrew: "דירוג",         Arabic: "التصنيف",            Portuguese: "Idade" },
  stepPacing:       { English: "Pacing",          Hebrew: "קצב",           Arabic: "الإيقاع",            Portuguese: "Ritmo" },
  stepLengthShort:  { English: "Length",          Hebrew: "אורך",          Arabic: "الطول",              Portuguese: "Duração" },
  stepRules:        { English: "Rules",           Hebrew: "חוקים",         Arabic: "القواعد",            Portuguese: "Regras" },
  stepPOV:          { English: "POV",             Hebrew: "מבט",           Arabic: "المنظور",            Portuguese: "POV" },
  stepSeed:         { English: "Seed",            Hebrew: "זרע",           Arabic: "البذرة",             Portuguese: "Ideia" },
  stepHero:         { English: "Hero",            Hebrew: "גיבור",         Arabic: "البطل",              Portuguese: "Herói" },
  rulesSet:         { English: "Set",             Hebrew: "הוגדר",         Arabic: "تم",                 Portuguese: "Pronto" },
  seedSurprise:     { English: "Surprise",        Hebrew: "הפתעה",         Arabic: "مفاجأة",             Portuguese: "Surpresa" },
  learnLangHint:    {
    English:    "Optional educational mode: pick a language you're learning and a small Translate button will appear beneath each passage so you can compare it to your native text.",
    Hebrew:     "מצב למידה אופציונלי: בחר שפה שאתה לומד, וכפתור תרגום קטן יופיע מתחת לכל קטע כדי שתוכל להשוות אותו לטקסט בשפת האם שלך.",
    Arabic:     "وضع تعليمي اختياري: اختر لغةً تتعلمها وسيظهر زر ترجمة صغير أسفل كل مقطع لتتمكن من مقارنته بنصّك بلغتك الأم.",
    Portuguese: "Modo educacional opcional: escolha um idioma que está a aprender e um pequeno botão Traduzir aparecerá sob cada passagem para poder compará-la com o texto na sua língua nativa.",
  },
  translating:      { English: "Translating…",   Hebrew: "מתרגם…",       Arabic: "جارٍ الترجمة…", Portuguese: "Traduzindo…" },
  hideTranslation:  { English: "Hide translation", Hebrew: "הסתר תרגום", Arabic: "إخفاء الترجمة", Portuguese: "Ocultar tradução" },
  translationError: { English: "Translation failed — try again.", Hebrew: "התרגום נכשל — נסה שוב.", Arabic: "فشلت الترجمة — حاول مرة أخرى.", Portuguese: "Falha na tradução — tente novamente." },
  // ── Chapter situation / approach hints ──
  revealHint:       { English: "Reveal hint",          Hebrew: "חשוף רמז",           Arabic: "كشف تلميح",            Portuguese: "Revelar dica" },
  hideHint:         { English: "Hide hint",            Hebrew: "הסתר רמז",           Arabic: "إخفاء التلميح",       Portuguese: "Ocultar dica" },
  theSituation:     { English: "The situation",        Hebrew: "המצב",               Arabic: "الموقف",                Portuguese: "A situação" },
  winCondition:     { English: "To move on",           Hebrew: "כדי להמשיך",         Arabic: "للمضي قدماً",           Portuguese: "Para avançar" },
  revealApproach:   { English: "Reveal an approach",   Hebrew: "חשוף דרך פעולה",     Arabic: "كشف طريقة",            Portuguese: "Revelar uma abordagem" },
  anApproach:       { English: "An approach",          Hebrew: "דרך אפשרית",         Arabic: "طريقة ممكنة",          Portuguese: "Uma abordagem" },
  progressLabel:    { English: "Progress",             Hebrew: "התקדמות",            Arabic: "التقدم",                Portuguese: "Progresso" },
  chapterSolvedMsg: { English: "Situation resolved",   Hebrew: "המצב נפתר",          Arabic: "تم حل الموقف",         Portuguese: "Situação resolvida" },
  preparingChapter: { English: "Preparing the next chapter...", Hebrew: "מכין את הפרק הבא...", Arabic: "جارٍ تحضير الفصل التالي...", Portuguese: "Preparando o próximo capítulo..." },
  preparingAdventure: { English: "Preparing your adventure...", Hebrew: "מכין את ההרפתקה שלך...", Arabic: "جارٍ تحضير مغامرتك...", Portuguese: "Preparando a sua aventura..." },
  continueBtn:      { English: "Continue",             Hebrew: "המשך",                Arabic: "متابعة",                Portuguese: "Continuar" },
  theEnd:           { English: "The End",              Hebrew: "הסוף",                Arabic: "النهاية",               Portuguese: "Fim" },
  advPrologueTitle: { English: "The Story",            Hebrew: "הסיפור",              Arabic: "القصة",                 Portuguese: "A História" },
  chapterPrologueTitle: { English: "Your Objective",   Hebrew: "המשימה שלך",          Arabic: "مهمتك",                 Portuguese: "O Seu Objetivo" },
  chapterClosureTitle: { English: "Chapter Complete",  Hebrew: "הפרק הושלם",          Arabic: "اكتمل الفصل",          Portuguese: "Capítulo Concluído" },
  chapterBriefFailed: { English: "Could not prepare the chapter.", Hebrew: "לא ניתן היה להכין את הפרק.", Arabic: "تعذّر تحضير الفصل.", Portuguese: "Não foi possível preparar o capítulo." },
  retryChapterBrief: { English: "Try again",                     Hebrew: "נסה שוב",             Arabic: "حاول مرة أخرى",        Portuguese: "Tentar novamente" },
  continueAnyway:   { English: "Continue without a chapter goal", Hebrew: "המשך ללא מטרת פרק",  Arabic: "المتابعة بدون هدف للفصل", Portuguese: "Continuar sem objetivo de capítulo" },
  // ── Settings ──
  settings:         { English: "Settings", Hebrew: "הגדרות", Arabic: "إعدادات", Portuguese: "Configurações" },
  settingsSub:      { English: "Customize your reading experience", Hebrew: "התאם את חוויית הקריאה שלך", Arabic: "خصّص تجربة القراءة", Portuguese: "Personalize a sua experiência de leitura" },
  theme_:           { English: "Theme", Hebrew: "ערכת נושא", Arabic: "السمة", Portuguese: "Tema" },
  themeDark:        { English: "Dark", Hebrew: "כהה", Arabic: "داكن", Portuguese: "Escuro" },
  themeLight:       { English: "Light", Hebrew: "בהיר", Arabic: "فاتح", Portuguese: "Claro" },
  fontFamily_:      { English: "Font", Hebrew: "גופן", Arabic: "الخط", Portuguese: "Fonte" },
  fontSans:         { English: "Sans", Hebrew: "סאנס", Arabic: "سانس", Portuguese: "Sans" },
  fontSerif:        { English: "Serif", Hebrew: "סריף", Arabic: "سيريف", Portuguese: "Serif" },
  fontMono:         { English: "Mono", Hebrew: "מונו", Arabic: "مونو", Portuguese: "Mono" },
  fontDyslexic:     { English: "Dyslexic", Hebrew: "דיסלקסיה", Arabic: "دسلكسي", Portuguese: "Dislexia" },
  fontSize_:        { English: "Text size", Hebrew: "גודל טקסט", Arabic: "حجم النص", Portuguese: "Tamanho do texto" },
  sizeS:            { English: "S", Hebrew: "S", Arabic: "S", Portuguese: "S" },
  sizeM:            { English: "M", Hebrew: "M", Arabic: "M", Portuguese: "M" },
  sizeL:            { English: "L", Hebrew: "L", Arabic: "L", Portuguese: "L" },
  sizeXL:           { English: "XL", Hebrew: "XL", Arabic: "XL", Portuguese: "XL" },
  music_:           { English: "Music", Hebrew: "מוזיקה", Arabic: "موسيقى", Portuguese: "Música" },
  // ── Adventure length options ──
  sprint:           { English: "Sprint",   Hebrew: "ספרינט",  Arabic: "سريع",   Portuguese: "Sprint" },
  sprintDesc:       { English: "1 chapter — one situation to solve", Hebrew: "פרק אחד — מצב אחד לפתור", Arabic: "فصل واحد — موقف واحد لحله", Portuguese: "1 capítulo — uma situação para resolver" },
  shortAdv:         { English: "Short",    Hebrew: "קצר",     Arabic: "قصير",   Portuguese: "Curta" },
  shortAdvDesc:     { English: "2 chapters",             Hebrew: "2 פרקים",              Arabic: "فصلان",                Portuguese: "2 capítulos" },
  standard:         { English: "Standard", Hebrew: "רגיל",    Arabic: "عادي",   Portuguese: "Padrão" },
  standardDesc:     { English: "4 chapters",             Hebrew: "4 פרקים",              Arabic: "4 فصول",               Portuguese: "4 capítulos" },
  epic:             { English: "Epic",     Hebrew: "אפי",     Arabic: "ملحمي",  Portuguese: "Épica" },
  epicDesc:         { English: "8 chapters",             Hebrew: "8 פרקים",              Arabic: "8 فصول",               Portuguese: "8 capítulos" },
  // ── Mode picker ──
  modePickerTitle:    { English: "How do you want to play?", Hebrew: "איך תרצו לשחק?", Arabic: "كيف تريد أن تلعب؟", Portuguese: "Como queres jogar?" },
  modeAdventure:      { English: "Choose Your Own Adventure", Hebrew: "בחר את ההרפתקה שלך", Arabic: "اختر مغامرتك بنفسك", Portuguese: "Escolhe a Tua Aventura" },
  modeAdventureSub:   { English: "Shape the story with your choices. Every decision matters.", Hebrew: "עצב את הסיפור עם הבחירות שלך. כל החלטה חשובה.", Arabic: "شكّل القصة باختياراتك. كل قرار يهمّ.", Portuguese: "Molda a história com as tuas escolhas. Cada decisão importa." },
  modeDnd:            { English: "D&D Mode", Hebrew: "מצב D&D", Arabic: "وضع D&D", Portuguese: "Modo D&D" },
  modeDndSub:         { English: "Dice rolls, ability scores, and a Dungeon Master in a high-fantasy world.", Hebrew: "הטלות קוביות, ציוני יכולות ו-Dungeon Master בעולם פנטזיה.", Arabic: "رميات النرد، نقاط القدرات، وسيد الزنزانة في عالم فانتازيا.", Portuguese: "Rolagens de dados, pontuações de habilidade e um Dungeon Master num mundo de fantasia." },
  modeEducational:    { English: "Educational Mode", Hebrew: "מצב לימודי", Arabic: "الوضع التعليمي", Portuguese: "Modo Educacional" },
  modeEducationalSub: { English: "Read and play in a language you're learning.", Hebrew: "קרא ושחק בשפה שאתה לומד.", Arabic: "اقرأ والعب بلغة تتعلمها.", Portuguese: "Lê e joga numa língua que estás a aprender." },
  // ── Educational wizard step ──
  stepLearnLang:        { English: "Language", Hebrew: "שפה", Arabic: "اللغة", Portuguese: "Idioma" },
  learnLangRequired:    { English: "Choose a language to learn", Hebrew: "בחר שפה ללמוד", Arabic: "اختر لغة لتتعلمها", Portuguese: "Escolhe uma língua para aprender" },
  learnLangRequiredSub: { English: "Words in the story will be translatable as you read.", Hebrew: "מילות הסיפור יהיו ניתנות לתרגום.", Arabic: "ستكون كلمات القصة قابلة للترجمة.", Portuguese: "As palavras da história serão traduzíveis à medida que lês." },
  // ── D&D labels ──
  dndRace:          { English: "Race",           Hebrew: "גזע",         Arabic: "العرق",       Portuguese: "Raça" },
  dndClass:         { English: "Class",          Hebrew: "מחלקה",       Arabic: "الفئة",       Portuguese: "Classe" },
  dndAbilityScores: { English: "Ability Scores", Hebrew: "ציוני יכולת", Arabic: "نقاط القدرات", Portuguese: "Pontuações de Habilidade" },
  dndStandardArray: { English: "Standard Array", Hebrew: "מערך סטנדרטי", Arabic: "المصفوفة القياسية", Portuguese: "Matriz Padrão" },
  dndRollStats:     { English: "Roll Stats",     Hebrew: "הטל יכולות",  Arabic: "ارمِ القدرات", Portuguese: "Lançar Atributos" },
  stepDndHero:      { English: "Hero",           Hebrew: "גיבור",       Arabic: "البطل",       Portuguese: "Herói" },
  dndContinue:      { English: "Enter the Dungeon", Hebrew: "כנס למבוך", Arabic: "ادخل الزنزانة", Portuguese: "Entrar na Masmorra" },
  statSTR: { English: "STR", Hebrew: "כוח",    Arabic: "قوة",    Portuguese: "FOR" },
  statDEX: { English: "DEX", Hebrew: "זריזות", Arabic: "رشاقة",  Portuguese: "DES" },
  statCON: { English: "CON", Hebrew: "חוסן",   Arabic: "بنية",   Portuguese: "CON" },
  statINT: { English: "INT", Hebrew: "אינטל",  Arabic: "ذكاء",   Portuguese: "INT" },
  statWIS: { English: "WIS", Hebrew: "חוכמה",  Arabic: "حكمة",   Portuguese: "SAB" },
  statCHA: { English: "CHA", Hebrew: "כריזמה", Arabic: "جاذبية", Portuguese: "CAR" },
};

// ─── GENRE THEMES ──────────────────────────────────────────────
// Each genre is a thin overlay: accent color + display font only.
// Canvas colors (bg, text, border, bgImage) come from BRAND — the app
// stays ink/ivory always. Genre changes the voice, not the stage.
const THEMES = {
  fantasy: {
    nameKey: "fantasy",
    primary:     "#a584c4",   // purple — arcane, mystical
    secondary:   "#8ba0b2",
    accent:      "#d4bce4",
    heading:     "'Cormorant Garamond', 'Fraunces', serif",
    body:        "'Fraunces', 'Cormorant Garamond', serif",
    displayFont: "'Cormorant Garamond', serif",
    displayItalic: true,
  },
  scifi: {
    nameKey: "scifi",
    primary:     "#6ec9d8",   // cyan
    secondary:   "#8ba0b2",
    accent:      "#c9a24a",
    heading:     "'Space Grotesk', 'Inter', sans-serif",
    body:        "'Inter', 'Space Grotesk', system-ui, sans-serif",
    displayFont: "'Space Grotesk', sans-serif",
    displayItalic: false,
  },
  reality: {
    nameKey: "reality",
    primary:     "#b25b3a",   // rust — grounded, warm
    secondary:   "#8ba0b2",
    accent:      "#c9a24a",
    heading:     "'DM Serif Display', 'Fraunces', serif",
    body:        "'Fraunces', 'Inter', serif",
    displayFont: "'DM Serif Display', serif",
    displayItalic: false,
  },
  mystery: {
    nameKey: "mystery",
    primary:     "#c9a24a",   // gold — warm, classic noir
    secondary:   "#8ba0b2",
    accent:      "#e3c983",
    heading:     "'Playfair Display', 'Fraunces', serif",
    body:        "'Fraunces', 'Playfair Display', serif",
    displayFont: "'Playfair Display', serif",
    displayItalic: true,
  },
};

const GENRE_SKILLS = {
  fantasy: { en: ["Swordsmanship","Magic","Stealth","Diplomacy","Archery","Alchemy","Beast Taming","Healing"], he: ["סייפנות","קסם","התגנבות","דיפלומטיה","קשתות","אלכימיה","אילוף חיות","ריפוי"] },
  scifi:   { en: ["Hacking","Piloting","Marksmanship","Engineering","Telepathy","Medicine","Stealth","Diplomacy"], he: ["פריצה","טיסה","קליעה","הנדסה","טלפתיה","רפואה","התגנבות","דיפלומטיה"] },
  reality: { en: ["Streetwise","Athletics","Persuasion","First Aid","Driving","Tech Savvy","Investigation","Survival"], he: ["תושייה","אתלטיקה","שכנוע","עזרה ראשונה","נהיגה","טכנולוגיה","חקירה","הישרדות"] },
  mystery: { en: ["Deduction","Interrogation","Disguise","Lockpicking","Forensics","Persuasion","Streetwise","Research"], he: ["דדוקציה","חקירה","תחפושת","פריצת מנעולים","זיהוי פלילי","שכנוע","תושייה","מחקר"] },
};

const LANGUAGES = [
  { code: "English",    label: "English",   flag: "gb" },
  { code: "Hebrew",     label: "עברית",     flag: "il" },
  { code: "Arabic",     label: "العربية",   flag: "sa" },
  { code: "Portuguese", label: "Português (Portugal)", flag: "pt" },
];
const flagSrc = (cc) => `https://flagcdn.com/w40/${cc}.png`;
const flagSrc2x = (cc) => `https://flagcdn.com/w80/${cc}.png`;

const FONTS_URL = "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..900,0..100;1,9..144,300..900,0..100&family=Inter:wght@300;400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=Space+Grotesk:wght@400;500;700&family=DM+Serif+Display&family=Playfair+Display:ital,wght@1,600&family=JetBrains+Mono:wght@400;500&family=Lexend:wght@400;500;700&display=swap";

// ─── BRAND THEME (ink / ivory / ember) ─────────────────────────
// Prestige editorial palette — treat OpenStory like an A24 film or Criterion release.
// Two palettes: dark (default) and light. Genre THEMES layer accent tints + display font on top.
const BRAND = {
  dark: {
    bg:        "#0b0b0d",                    // ink
    bgSoft:    "#121216",                    // ink-2
    bgCard:    "rgba(18, 18, 22, 0.82)",
    bgStory:   "rgba(241, 236, 226, 0.025)",
    primary:   "#c9a24a",                    // gold — ember accent
    secondary: "#6ec9d8",                    // cyan — cold counterpoint
    accent:    "#e3c983",                    // gold-soft — highlight
    text:      "#f1ece2",                    // ivory
    textMuted: "#8b867c",                    // ivory-mute
    textDim:   "#cfc9bd",                    // ivory-dim
    border:    "#2a2a32",                    // line
    bgImage:   "radial-gradient(ellipse at 18% 8%, rgba(201,162,74,0.045) 0%, transparent 55%), radial-gradient(ellipse at 82% 92%, rgba(110,201,216,0.025) 0%, transparent 55%)",
  },
  light: {
    bg:        "#f1ece2",                    // ivory
    bgSoft:    "#e6e1d5",
    bgCard:    "rgba(255, 253, 247, 0.88)",
    bgStory:   "rgba(11, 11, 13, 0.035)",
    primary:   "#b25b3a",                    // rust — warm accent on ivory
    secondary: "#3e6a78",
    accent:    "#c9a24a",                    // gold still plays in light
    text:      "#0b0b0d",                    // ink
    textMuted: "#6b6760",
    textDim:   "#3a3833",
    border:    "#d1ccbf",
    bgImage:   "radial-gradient(ellipse at 18% 8%, rgba(178,91,58,0.05) 0%, transparent 55%), radial-gradient(ellipse at 82% 92%, rgba(62,106,120,0.03) 0%, transparent 55%)",
  },
};

// User-customizable font families (applied via CSS vars)
const FONT_STACKS = {
  sans:     { heading: "'Fraunces', 'Cormorant Garamond', serif", body: "'Inter', system-ui, sans-serif" },
  serif:    { heading: "'Fraunces', 'Cormorant Garamond', serif", body: "'Fraunces', 'Cormorant Garamond', Georgia, serif" },
  mono:     { heading: "'JetBrains Mono', ui-monospace, monospace", body: "'JetBrains Mono', ui-monospace, monospace" },
  dyslexic: { heading: "'Lexend', system-ui, sans-serif",         body: "'Lexend', system-ui, sans-serif" },
};

const FONT_SIZES = { s: 14, m: 16, l: 18, xl: 20 };
const MOBILE_BREAKPOINT = 720;

function loadPrefs() {
  try {
    const raw = localStorage.getItem("openstory_prefs");
    if (!raw) return null;
    const p = JSON.parse(raw);
    const langs = ["English","Hebrew","Arabic","Portuguese"];
    return {
      themeMode: p.themeMode === "light" ? "light" : "dark",
      font:      ["sans","serif","mono","dyslexic"].includes(p.font) ? p.font : "sans",
      size:      ["s","m","l","xl"].includes(p.size) ? p.size : "m",
      language:  langs.includes(p.language) ? p.language : "English",
      translationLanguage: p.translationLanguage === "off" || langs.includes(p.translationLanguage) ? p.translationLanguage : "off",
      wordHintDismissed: !!p.wordHintDismissed,
    };
  } catch { return null; }
}
function savePrefs(p) {
  try { localStorage.setItem("openstory_prefs", JSON.stringify(p)); } catch {}
}

const WORD_CACHE_KEY = "openstory_word_cache";
const WORD_CACHE_MAX = 5000;
function loadWordCache() {
  try {
    const raw = localStorage.getItem(WORD_CACHE_KEY);
    if (!raw) return {};
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch { return {}; }
}
function saveWordCache(cache) {
  try {
    const keys = Object.keys(cache);
    let toSave = cache;
    if (keys.length > WORD_CACHE_MAX) {
      // FIFO trim: drop oldest insertion-ordered keys
      const trimmed = {};
      const start = keys.length - WORD_CACHE_MAX;
      for (let i = start; i < keys.length; i++) trimmed[keys[i]] = cache[keys[i]];
      toSave = trimmed;
    }
    localStorage.setItem(WORD_CACHE_KEY, JSON.stringify(toSave));
  } catch {}
}
// Split text into a sequence of {type, text} tokens. Words are alphabetic runs (Unicode-aware:
// Latin letters + Hebrew + Arabic + accents). Everything else (whitespace, punctuation) is a "gap".
// Splitting this way lets us re-render the paragraph with clickable spans without losing layout.
const WORD_RE = /[\p{L}\p{M}'’׳״]+/gu;
function splitIntoTokens(text) {
  if (!text) return [];
  const out = [];
  let last = 0;
  for (const m of text.matchAll(WORD_RE)) {
    if (m.index > last) out.push({ type: "gap", text: text.slice(last, m.index) });
    out.push({ type: "word", text: m[0] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "gap", text: text.slice(last) });
  return out;
}
// Build a short ~5-word context window around a word index in the token list, for disambiguation.
function buildWordContext(tokens, idx, windowWords = 5) {
  const out = [];
  let before = 0, after = 0;
  for (let j = idx - 1; j >= 0 && before < windowWords; j--) { if (tokens[j].type === "word") before++; out.unshift(tokens[j].text); }
  out.push(tokens[idx].text);
  for (let j = idx + 1; j < tokens.length && after < windowWords; j++) { if (tokens[j].type === "word") after++; out.push(tokens[j].text); }
  return out.join("").trim().replace(/\s+/g, " ");
}
function targetLangLabel(code) {
  return code === "Portuguese"
    ? "European Portuguese (pt-PT, as spoken in Portugal — NOT Brazilian; use 'ficheiro' not 'arquivo', 'ecrã' not 'tela')"
    : code;
}
function wordCacheKey(lang, word) { return `${lang}::${word.toLowerCase()}`; }

const SETUP_STEPS   = ["genre", "age", "length", "duration", "rules", "prompt", "character"];
const STEP_DEFS_ADVENTURE = [
  { id: 0, icon: "scroll",  labelKey: "stepGenre"       },
  { id: 1, icon: "shield",  labelKey: "stepRating"      },
  { id: 2, icon: "bolt",    labelKey: "stepPacing"      },
  { id: 3, icon: "book",    labelKey: "stepLengthShort" },
  { id: 4, icon: "skull",   labelKey: "stepRules"       },
  { id: 5, icon: "sparkle", labelKey: "stepSeed"        },
  { id: 6, icon: "person",  labelKey: "stepHero"        },
];
const AUTO_ADVANCE_STEPS = new Set([0, 1, 2, 3]);

// ─── D&D CONSTANTS ─────────────────────────────────────────────
const DND_RACES   = ["Human","Elf","Dwarf","Halfling","Half-Orc","Gnome","Tiefling","Dragonborn"];
const DND_CLASSES = ["Fighter","Wizard","Rogue","Cleric","Ranger","Bard","Paladin","Druid","Barbarian","Monk","Warlock","Sorcerer"];
const DND_STATS   = ["STR","DEX","CON","INT","WIS","CHA"];
const DND_STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];

const DND_STAT_KEYWORDS = {
  STR: ["attack","melee","push","lift","break","athletics","climb","swim","jump","force"],
  DEX: ["stealth","sneak","hide","dodge","acrobatics","sleight","lockpick","ranged","bow","agility","reflex"],
  CON: ["endure","resist","concentration","fatigue","poison","survival","tough"],
  INT: ["arcana","history","lore","investigation","recall","decipher","magic","spell","knowledge"],
  WIS: ["perception","insight","medicine","nature","religion","sense","notice","detect","wisdom"],
  CHA: ["persuade","persuasion","deception","intimidation","performance","charm","bluff","negotiate"],
};

function getDndStatBonus(context, abilityScores) {
  if (!context || !abilityScores) return 0;
  const ctx = context.toLowerCase();
  for (const [stat, kws] of Object.entries(DND_STAT_KEYWORDS)) {
    if (kws.some(k => ctx.includes(k)))
      return Math.floor((abilityScores[stat] - 10) / 2);
  }
  return 0;
}

function getDiceOutcome(value, isDnd) {
  if (isDnd) {
    if (value === 1)   return { labelKey: "critFail",    color: "#FF2040", bg: "rgba(255,32,64,0.12)",    narrative: "critical failure — something goes catastrophically wrong" };
    if (value <= 9)    return { labelKey: "minorFail",   color: "#FF8C00", bg: "rgba(255,140,0,0.12)",   narrative: "clear failure with complications" };
    if (value <= 14)   return { labelKey: "partSuccess", color: "#4DB6AC", bg: "rgba(77,182,172,0.12)",  narrative: "partial success — it works but with a cost or catch" };
    if (value <= 19)   return { labelKey: "partSuccess", color: "#4DB6AC", bg: "rgba(77,182,172,0.12)",  narrative: "solid success" };
    return               { labelKey: "critSuccess", color: "#66BB6A", bg: "rgba(102,187,106,0.12)", narrative: "critical success — natural 20, exceptional outcome" };
  }
  return DICE_OUTCOMES[value];
}

// ─── MODE-AWARE STEP DEFINITIONS ───────────────────────────────
function getStepDefs(mode) {
  if (mode === "dnd") return [
    { id: 0, key: "age",           icon: "shield",  labelKey: "stepRating"      },
    { id: 1, key: "duration",      icon: "book",    labelKey: "stepLengthShort" },
    { id: 2, key: "prompt",        icon: "sparkle", labelKey: "stepSeed"        },
    { id: 3, key: "dnd-character", icon: "person",  labelKey: "stepDndHero"     },
  ];
  if (mode === "educational") return [
    { id: 0, key: "learnlang",    icon: "speech",  labelKey: "stepLearnLang"   },
    { id: 1, key: "genre",        icon: "scroll",  labelKey: "stepGenre"       },
    { id: 2, key: "age",          icon: "shield",  labelKey: "stepRating"      },
    { id: 3, key: "length",       icon: "bolt",    labelKey: "stepPacing"      },
    { id: 4, key: "duration",     icon: "book",    labelKey: "stepLengthShort" },
    { id: 5, key: "rules",        icon: "skull",   labelKey: "stepRules"       },
    { id: 6, key: "prompt",       icon: "sparkle", labelKey: "stepSeed"        },
    { id: 7, key: "character",    icon: "person",  labelKey: "stepHero"        },
  ];
  // adventure or unset
  return STEP_DEFS_ADVENTURE.map(s => ({ ...s, key: SETUP_STEPS[s.id] }));
}
function getSetupSteps(mode) { return getStepDefs(mode).map(s => s.key); }
function getAutoAdvanceSteps(mode) {
  const auto = new Set(["genre","age","length","duration","learnlang"]);
  return new Set(getStepDefs(mode).filter(s => auto.has(s.key)).map(s => s.id));
}
const SUMMARY_EVERY = 5;
const WINDOW_SIZE   = 16;
const RTL_LANGS     = ["Hebrew", "Arabic"];

// ─── NEAR-DUPLICATE MERGING ────────────────────────────────────
// Cumulative lists (chapterProgress.achieved/clues, worldState.locations/facts)
// are re-emitted by the LLM every turn, and it rewords them slightly each time.
// Exact-match `new Set()` never catches that, so the lists grew forever:
//   "הקלף מפותל מכיל שרטוטים לא ברורים של מפה."   <- trailing period
//   "הקלף מפותל מכיל שרטוטים לא ברורים של מפה"
//   "הקלף המפותל מכיל שרטוטים לא ברורים של מפה."  <- one extra letter
//   "מערה חסרת מוצא"  vs  "מערה חסרת מוצא — מלאה בעשן..."   <- bare vs annotated
// which bloats every prompt and, worse, looks like fresh progress to stuckTurns.
const normKey = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.,;:!?…׃]+$/u, "").trim();

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Same digits required: "רועי בחדר 1" and "רועי בחדר 2" are 95% identical as text
// but are different facts, and merging them would silently lose one.
const digitsOf = (s) => (s.match(/\d+/g) || []).join(",");

// True when `b` says the same thing as `a`: identical after normalisation, one
// contains the other (bare name vs annotated), or near-identical text.
function saysSame(a, b) {
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (digitsOf(a) !== digitsOf(b)) return false;
  const max = Math.max(a.length, b.length);
  return max > 0 && 1 - levenshtein(a, b) / max >= 0.9;
}

// Merge `incoming` into `existing`, keeping the longest (most informative)
// variant of each distinct item. Returns a new array.
function mergeDedup(existing = [], incoming = []) {
  const out = [];
  for (const raw of [...existing, ...incoming]) {
    const item = typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
    if (!item) continue;
    const key = normKey(item);
    const at = out.findIndex(o => saysSame(normKey(o), key));
    if (at === -1) out.push(item);
    else if (item.length > out[at].length) out[at] = item;  // prefer the annotated variant
  }
  return out;
}

// NPCs are keyed by name, but the LLM varies the key too ("רועי" / "רועי "),
// which would otherwise create a second entry for the same character. Match on
// the normalised name, keep the incoming status (it is the more recent one).
function mergeNpcs(prev = {}, incoming = {}) {
  const out = { ...prev };
  for (const [name, status] of Object.entries(incoming || {})) {
    const clean = String(name ?? "").trim();
    if (!clean) continue;
    const key = normKey(clean);
    const existing = Object.keys(out).find(k => normKey(k) === key);
    if (existing) out[existing] = status;
    else out[clean] = status;
  }
  return out;
}

// Provider-enforced shape for a game turn. Keep in sync with the JSON stub in
// buildSystemPrompt — the prompt teaches the model what the fields MEAN, this
// makes the provider guarantee their TYPES.
//
// Prompting alone does not work: instructing the model that choices are plain
// strings changed the violation rate 4/8 -> 4/8. With this schema it is 0/8, and
// malformed JSON goes 4/8 -> 0/8. `stats` is always required even when
// trackStats is off (the caller just ignores it) — strict mode has no way to
// make a property conditional, and an unused object is cheaper than two schemas.
const TURN_SCHEMA = {
  name: "turn",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["story", "choices", "stats", "gameOver", "gameOverReason", "rollRequired", "rollContext",
               "chapterSolved", "solvedVia", "chapterProgress", "mood", "worldState"],
    properties: {
      story:   { type: "string" },
      choices: { type: "array", items: { type: "string" } },
      stats: {
        type: "object", additionalProperties: false,
        required: ["health", "inventory", "relationships"],
        properties: {
          health:        { type: "integer" },
          inventory:     { type: "array", items: { type: "string" } },
          relationships: { type: "object", additionalProperties: { type: "string" } },
        },
      },
      gameOver:       { type: "boolean" },
      gameOverReason: { type: "string" },
      rollRequired:   { type: "boolean" },
      rollContext:    { type: "string" },
      chapterSolved:  { type: "boolean" },
      solvedVia:      { type: "string" },
      chapterProgress: {
        type: "object", additionalProperties: false,
        required: ["achieved", "clues"],
        properties: {
          achieved: { type: "array", items: { type: "string" } },
          clues:    { type: "array", items: { type: "string" } },
        },
      },
      mood: { type: "string" },
      // npcs values are typed as strings here specifically because the model used
      // to return {status, location} objects, which rendered as "[object Object]"
      // straight into the next prompt and then persisted forever.
      worldState: {
        type: "object", additionalProperties: false,
        required: ["npcs", "locations", "facts"],
        properties: {
          npcs:      { type: "object", additionalProperties: { type: "string" } },
          locations: { type: "array", items: { type: "string" } },
          facts:     { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

// ─── STORY BIBLE ───────────────────────────────────────────────
// The whole arc, authored once up front from the wizard input. Frozen during a
// chapter; nudged only downstream when a chapter is solved (see clampBibleUpdate).
// This is what gives the game a plot rather than a string of unrelated puzzles.
const BIBLE_SCHEMA = {
  name: "bible", strict: true,
  schema: {
    type: "object", additionalProperties: false,
    required: ["logline", "centralConflict", "antagonist", "stakes", "keyFigures", "intendedEnding", "chapters"],
    properties: {
      logline:         { type: "string" },
      centralConflict: { type: "string" },
      antagonist: {
        type: "object", additionalProperties: false, required: ["name", "goal", "method"],
        properties: { name: { type: "string" }, goal: { type: "string" }, method: { type: "string" } },
      },
      stakes:         { type: "string" },
      keyFigures: {
        type: "array",
        items: { type: "object", additionalProperties: false, required: ["name", "role"],
                 properties: { name: { type: "string" }, role: { type: "string" } } },
      },
      intendedEnding: { type: "string" },
      chapters: {
        type: "array",
        items: { type: "object", additionalProperties: false, required: ["n", "beat"],
                 properties: { n: { type: "integer" }, beat: { type: "string" } } },
      },
    },
  },
};

// One call sets up a chapter: the hidden solving contract (brief) AND the
// player-facing prologue card with its opening choices. Replaces the old
// separate brief + opening-turn calls.
const CHAPTER_SCHEMA = {
  name: "chapter", strict: true,
  schema: {
    type: "object", additionalProperties: false,
    required: ["brief", "prologue"],
    properties: {
      brief: {
        type: "object", additionalProperties: false, required: ["title", "situation", "winCondition", "approaches"],
        properties: {
          title:        { type: "string" },
          situation:    { type: "string" },
          winCondition: { type: "string" },
          approaches:   { type: "array", items: { type: "string" } },
        },
      },
      prologue: {
        type: "object", additionalProperties: false, required: ["text", "choices"],
        properties: {
          text:    { type: "string" },
          choices: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

// On solve: the closure card text + a bounded, downstream-only bible update.
// The update fields are ADVISORY — clampBibleUpdate decides what actually changes.
const RESOLVE_SCHEMA = {
  name: "resolve", strict: true,
  schema: {
    type: "object", additionalProperties: false,
    required: ["closureText", "antagonistGoal", "antagonistMethod", "stakes", "intendedEnding", "futureChapters"],
    properties: {
      closureText:      { type: "string" },
      antagonistGoal:   { type: "string" },
      antagonistMethod: { type: "string" },
      stakes:           { type: "string" },
      intendedEnding:   { type: "string" },
      futureChapters: {
        type: "array",
        items: { type: "object", additionalProperties: false, required: ["n", "beat"],
                 properties: { n: { type: "integer" }, beat: { type: "string" } } },
      },
    },
  },
};

// The adventure prologue and any single-string narrative card.
const TEXT_SCHEMA = {
  name: "text", strict: true,
  schema: { type: "object", additionalProperties: false, required: ["text"], properties: { text: { type: "string" } } },
};

// Apply a solve-time update to the bible, clamped so the spine physically cannot
// move: logline, centralConflict, the antagonist's NAME, and every already-played
// chapter's beat are carried over untouched. Only the antagonist's goal/method,
// stakes, the intended ending, and FUTURE chapter beats may drift. Never trust the
// model to respect this — enforce it here (same posture as normalizeTurn).
function clampBibleUpdate(old, solvedN, upd) {
  if (!old) return old;
  const future = {};
  for (const c of (upd?.futureChapters || [])) {
    if (c && typeof c.n === "number" && c.n > solvedN && typeof c.beat === "string" && c.beat.trim()) {
      future[c.n] = c.beat.trim();
    }
  }
  const keep = (v, fallback) => (typeof v === "string" && v.trim() ? v.trim() : fallback);
  return {
    ...old,
    antagonist: {
      name:   old.antagonist?.name,                              // frozen
      goal:   keep(upd?.antagonistGoal,   old.antagonist?.goal),
      method: keep(upd?.antagonistMethod, old.antagonist?.method),
    },
    stakes:         keep(upd?.stakes,         old.stakes),
    intendedEnding: keep(upd?.intendedEnding, old.intendedEnding),
    chapters: (old.chapters || []).map(c =>
      c.n <= solvedN ? c : (future[c.n] != null ? { n: c.n, beat: future[c.n] } : c)),
  };
}

// Chapter counts the duration step offers. Chapters end when their situation is
// solved, never on a turn count — so this is the only measure of adventure size.
const CHAPTER_COUNTS = [1, 2, 4, 8];
// v2/v3 saves stored config.storyLength as a TURN budget (5/10/20/40). Used only
// to migrate those to config.chapterCount — never in live gameplay.
const LEGACY_CHAPTER_MAP = { 5: 1, 10: 2, 20: 4, 40: 8 };
// Turns without chapterProgress movement before the narrator must offer a costly
// way out, so a stuck player is never hard-blocked.
const STUCK_TURNS_LIMIT = 4;
// The chapter brief blocks play, so it retries before surfacing an error.
const BRIEF_MAX_ATTEMPTS = 3;

// Dice outcome table
const DICE_OUTCOMES = [
  null,
  { labelKey: "critFail",    color: "#FF2040", bg: "rgba(255,32,64,0.12)",    narrative: "something goes badly wrong — a real setback with consequences" },
  { labelKey: "minorFail",   color: "#FF8C00", bg: "rgba(255,140,0,0.12)",   narrative: "the attempt fails with a complication" },
  { labelKey: "minorFail",   color: "#FF8C00", bg: "rgba(255,140,0,0.12)",   narrative: "the attempt fails with a complication" },
  { labelKey: "partSuccess", color: "#4DB6AC", bg: "rgba(77,182,172,0.12)",  narrative: "partial success — it works but with a cost or catch" },
  { labelKey: "partSuccess", color: "#4DB6AC", bg: "rgba(77,182,172,0.12)",  narrative: "partial success — it works but with a cost or catch" },
  { labelKey: "critSuccess", color: "#66BB6A", bg: "rgba(102,187,106,0.12)", narrative: "exceptional success, better than expected" },
];

// ─── ICON SYSTEM ───────────────────────────────────────────────
// Single-stroke 24×24 SVGs in the prestige editorial style.
// Drawn by hand (see design_update.html) — not emoji. Use <Icon name="save" />.
const ICONS = {
  // UI
  save: (<><path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4"/><rect x="8" y="13" width="8" height="5"/></>),
  help: (<><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5c0-1.5 1.1-2.5 2.5-2.5s2.5 1 2.5 2.3c0 1.5-1.5 1.9-2 2.7-.3.5-.3 1-.3 1.5"/><circle cx="12" cy="17.2" r="0.6" fill="currentColor" stroke="none"/></>),
  key: (<><circle cx="8" cy="14" r="3.2"/><path d="M11 12l8-8"/><path d="M16 7l2 2"/><path d="M18 5l2 2"/></>),
  dice: (<><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="15" r="1" fill="currentColor" stroke="none"/></>),
  settings: (<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></>),
  close: (<><path d="M6 6l12 12M18 6L6 18"/></>),
  moon: (<><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></>),
  sun: (<><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>),
  music: (<><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></>),
  muted: (<><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18" stroke="currentColor"/></>),
  door: (<><path d="M6 3h12v18H6z"/><path d="M6 3v18"/><circle cx="14" cy="12" r="0.8" fill="currentColor" stroke="none"/></>),
  "export": (<><path d="M6 3h9l3 3v15H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></>),
  check: (<><path d="M5 12l5 5L19 7"/></>),
  bulb: (<><path d="M9 18h6M10 21h4"/><path d="M8 14a5 5 0 1 1 8 0c-.7.7-1 1.5-1 2.5V18H9v-1.5c0-1-.3-1.8-1-2.5z"/></>),
  sparkle: (<><path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z"/></>),
  warning: (<><path d="M12 3l10 18H2z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="0.8" fill="currentColor" stroke="none"/></>),
  skull: (<><path d="M5 11a7 7 0 0 1 14 0v5l-2 1v3h-3v-2h-4v2H7v-3l-2-1z"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><path d="M11 16h2"/></>),
  shield: (<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></>),
  chart: (<><path d="M3 20h18"/><path d="M7 20v-7M12 20V8M17 20v-4"/></>),
  book: (<><path d="M3 5c3-1 6-1 9 1 3-2 6-2 9-1v13c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6v13"/></>),
  person: (<><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></>),
  speech: (<><path d="M4 5h16v10H8l-4 4z"/></>),
  bolt: (<><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></>),
  run: (<><circle cx="15" cy="4.5" r="1.5"/><path d="M13 8l-3 2 2 4-3 5M10 14l-2-1-3 3M15 13l3 1 1 4"/></>),
  mountain: (<><path d="M3 19l6-10 4 6 3-4 5 8z"/><path d="M9 9l2-3 2 3"/></>),
  clapper: (<><rect x="3" y="7" width="18" height="12" rx="1"/><path d="M3 11h18"/><path d="M7 7l-1-3 4 1 1 3M12 7l-1-3 4 1 1 3"/></>),
  masks: (<><path d="M4 7c0 5 2.5 9 6 9s6-4 6-9"/><path d="M8 7c0 5 2.5 9 6 9s6-4 6-9"/><circle cx="7" cy="10" r="0.7" fill="currentColor" stroke="none"/><circle cx="11" cy="10" r="0.7" fill="currentColor" stroke="none"/></>),
  wand: (<><path d="M14 3h6v6"/><path d="M20 3 9 14"/><path d="M10 13l-4 4 2 2 4-4"/><path d="M6 17l-3 3"/></>),
  chevronLeft:  (<><path d="M15 6l-6 6 6 6"/></>),
  chevronRight: (<><path d="M9 6l6 6-6 6"/></>),
  chevronDown:  (<><path d="M6 9l6 6 6-6"/></>),
  scroll:       (<><path d="M6 3h11c1.1 0 2 .9 2 2v3h-2"/><path d="M17 8v10c0 1.7 1.3 3 3 3H8c-1.7 0-3-1.3-3-3V5c0-1.1.9-2 2-2"/><path d="M9 8h5M9 12h5M9 16h3"/></>),

  // Genre motifs — fantasy (gold)
  fantasySword:   (<><path d="M14 3h6v6"/><path d="M20 3 9 14"/><path d="M10 13l-4 4 2 2 4-4"/><path d="M6 17l-3 3"/></>),
  fantasyPeaks:   (<><path d="M4 19h16"/><path d="M6 19 13 5l5 14"/><path d="M9 12l6 2"/></>),
  fantasyDragon:  (<><path d="M4 14c0-4 3-7 7-7 3 0 5 2 5 4s-1 3-3 3c-1 0-2-.5-2-1.5"/><path d="M16 11c2 0 4 1 4 4s-2 5-5 5c-4 0-7-2-7-5"/><circle cx="10.5" cy="11" r="0.5" fill="currentColor" stroke="none"/></>),
  fantasyCastle:  (<><path d="M3 20V9l2-1v3h2V7l2-1v4h2V8l2-1v3h2V6l2-1v5l2 1v7z"/><path d="M10 20v-5h4v5"/></>),
  fantasyLeaf:    (<><path d="M4 20c0-9 7-16 16-16 0 9-7 16-16 16z"/><path d="M4 20 14 10"/></>),

  // scifi (cyan)
  scifiRocket:    (<><path d="M12 3c4 3 6 7 6 11l-3 2h-6l-3-2c0-4 2-8 6-11z"/><circle cx="12" cy="11" r="1.5"/><path d="M9 16l-2 4 3-1M15 16l2 4-3-1"/></>),
  scifiRobot:     (<><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M12 4v3"/><circle cx="9" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13" r="1" fill="currentColor" stroke="none"/><path d="M9 17h6"/></>),
  scifiAlien:     (<><path d="M5 10a7 7 0 0 1 14 0c0 4-3 7-7 10-4-3-7-6-7-10z"/><ellipse cx="9.5" cy="11" rx="1.2" ry="2" fill="currentColor" stroke="none"/><ellipse cx="14.5" cy="11" rx="1.2" ry="2" fill="currentColor" stroke="none"/></>),
  scifiUfo:       (<><rect x="10" y="10" width="4" height="4" transform="rotate(45 12 12)"/><path d="M7 7l-3 3M20 4l-3 3M7 17l-3 3M17 17l3 3"/><circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none"/></>),
  scifiBolt:      (<><path d="M13 3 5 14h6l-1 7 8-11h-6z"/></>),

  // reality (slate)
  realityGlobe:   (<><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></>),
  realityCity:    (<><path d="M3 20h18"/><path d="M5 20V10l3-2 3 2v10"/><path d="M13 20V6l4-2 4 3v13"/><path d="M7 14h2M7 17h2M15 10h3M15 14h3M15 17h3"/></>),
  realityCar:     (<><path d="M4 15l2-6h12l2 6v3H4z"/><circle cx="7.5" cy="18" r="1.5"/><circle cx="16.5" cy="18" r="1.5"/></>),
  realityCase:    (<><rect x="3" y="8" width="18" height="12" rx="1"/><path d="M9 8V5h6v3"/><path d="M3 14h18"/></>),
  realityMap:     (<><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v16M15 6v16"/></>),

  // mystery (amber)
  mysteryGlass:   (<><circle cx="10" cy="10" r="6"/><path d="M15 15l5 5"/></>),
  mysteryCandle:  (<><rect x="9" y="9" width="6" height="11"/><path d="M12 9V5c0-1 1-2 2-2s1 2 0 3-2 2-2 3"/><path d="M7 20h10"/></>),
  mysteryKey:     (<><circle cx="8" cy="14" r="3.2"/><path d="M11 12l8-8"/><path d="M16 7l2 2"/><path d="M18 5l2 2"/></>),
  mysterySkull:   (<><path d="M5 12a7 7 0 0 1 14 0v4l-2 1v3h-3v-2h-4v2H7v-3l-2-1z"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><path d="M11 16h2"/></>),
  mysteryFog:     (<><path d="M4 9h12M6 13h14M4 17h10M14 17h6"/></>),
};

// Per-genre motif icons used by GenreIconStrip.
const GENRE_ICONS = {
  fantasy: ["fantasySword", "fantasyPeaks", "fantasyDragon", "fantasyCastle", "fantasyLeaf"],
  scifi:   ["scifiRocket", "scifiRobot", "scifiAlien", "scifiUfo", "scifiBolt"],
  reality: ["realityGlobe", "realityCity", "realityCar", "realityCase", "realityMap"],
  mystery: ["mysteryGlass", "mysteryCandle", "mysteryKey", "mysterySkull", "mysteryFog"],
};

function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.5, style, ...props }) {
  const content = ICONS[name];
  if (!content) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color}
         strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
         style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...(style || {}) }}
         aria-hidden="true" {...props}>
      {content}
    </svg>
  );
}

// Book-mark SVG — a spread book drawn in a single stroke, with a gold ember where
// the sparkle flourish used to be. Re-usable at any size.
function BookMark({ size = 48, stroke = "currentColor", ember = "#c9a24a", style }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}
         style={{ display: "inline-block", flexShrink: 0, ...(style || {}) }}
         aria-hidden="true">
      <line x1="32" y1="14" x2="32" y2="52" stroke={stroke} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M32 14 C 22 14, 14 18, 10 22 L 10 50 C 14 46, 22 44, 32 46 Z"
            fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M32 14 C 42 14, 50 18, 54 22 L 54 50 C 50 46, 42 44, 32 46 Z"
            fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="32" cy="9" r="1.8" fill={ember}/>
    </svg>
  );
}

// Wordmark — book mark + "OpenStory" in Fraunces, "AI" small-caps Inter in gold.
// Sizes: 'sm' (inline, ~18px), 'md' (header ~28px), 'lg' (hero ~52px), 'xl' (splash ~72px).
function Wordmark({ size = "md", theme, align = "center", style }) {
  const sizeMap = { sm: 18, md: 28, lg: 52, xl: 72 };
  const fontPx   = sizeMap[size] || sizeMap.md;
  const markPx   = Math.round(fontPx * 1.08);
  const textCol  = theme?.text || "#f1ece2";
  const accentCol= theme?.accent || theme?.primary || "#c9a24a";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: fontPx * 0.28,
      justifyContent: align === "center" ? "center" : "flex-start",
      lineHeight: 1, direction: "ltr", ...(style || {}),
    }}>
      <BookMark size={markPx} stroke={textCol} ember={accentCol} />
      <span style={{
        fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
        fontWeight: 350,
        fontVariationSettings: '"opsz" 144, "SOFT" 20',
        fontSize: fontPx, letterSpacing: "-0.01em",
        color: textCol,
      }}>
        OpenStory
        <span style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontWeight: 500,
          fontSize: fontPx * 0.28,
          letterSpacing: "0.28em",
          verticalAlign: "0.9em",
          marginInlineStart: `${fontPx * 0.018}em`,
          color: accentCol,
          textTransform: "uppercase",
        }}>AI</span>
      </span>
    </span>
  );
}

// ─── CHARACTER GENERATION ──────────────────────────────────────
const CHARACTER_NAMES = {
  English: {
    fantasy: { male: ["Aldric", "Theron", "Kael", "Dorian", "Soren", "Varen"],       female: ["Lyra", "Seraphine", "Elara", "Miryn", "Vesper", "Nara"] },
    scifi:   { male: ["Zephyr", "Axon", "Riven", "Coda", "Voss", "Nex"],             female: ["Nova", "Sable", "Zara", "Kira", "Aria", "Cyra"] },
    reality: { male: ["Marcus", "Leo", "Dante", "Finn", "Eli", "Rafael"],            female: ["Maya", "Nora", "Cass", "Elena", "Jade", "Iris"] },
    mystery: { male: ["Victor", "Edmund", "Felix", "Caine", "Lucian", "Dorian"],     female: ["Vera", "Madeleine", "Petra", "Cleo", "Margot", "Isolde"] },
  },
  Hebrew: {
    fantasy: { male: ["אביב", "איתן", "תומר", "דורון", "יאיר", "בועז"],             female: ["יעל", "טליה", "נעה", "מאיה", "הילה", "שיר"] },
    scifi:   { male: ["רוני", "עומר", "נדב", "איתי", "לירון", "עידו"],              female: ["נגה", "טל", "מיכל", "סתיו", "עדי", "ליאור"] },
    reality: { male: ["יוסי", "אמיר", "דניאל", "אופיר", "רועי", "אייל"],            female: ["מאיה", "שירה", "רותם", "נעמי", "ענבל", "תמר"] },
    mystery: { male: ["אסף", "גל", "איתן", "אריאל", "שחר", "רונן"],                 female: ["איריס", "ליאת", "ורד", "סיגל", "אורית", "שירי"] },
  },
  Arabic: {
    fantasy: { male: ["خالد", "عمر", "طارق", "ياسر", "زيد", "فارس"],               female: ["ليلى", "زهرة", "نور", "ريم", "لمى", "سلمى"] },
    scifi:   { male: ["يوسف", "عمار", "كريم", "آدم", "أمين", "رامي"],              female: ["رنا", "سحر", "دانيا", "نادين", "لانا", "مايا"] },
    reality: { male: ["محمد", "أحمد", "علي", "حسن", "سامي", "مازن"],              female: ["فاطمة", "عائشة", "مريم", "هدى", "سارة", "لينا"] },
    mystery: { male: ["مصطفى", "إلياس", "نبيل", "جواد", "جلال", "نجيب"],           female: ["نادية", "عبير", "فيروز", "سعاد", "ثريا", "رغد"] },
  },
  Portuguese: {
    fantasy: { male: ["Afonso", "Bernardo", "Duarte", "Henrique", "Lourenço", "Vasco"], female: ["Beatriz", "Constança", "Inês", "Leonor", "Mafalda", "Margarida"] },
    scifi:   { male: ["Tomás", "Diogo", "Rodrigo", "Gonçalo", "Tiago", "Bruno"],         female: ["Mariana", "Carolina", "Matilde", "Madalena", "Joana", "Íris"] },
    reality: { male: ["João", "Pedro", "Miguel", "André", "Rui", "Hugo"],                female: ["Sofia", "Catarina", "Marta", "Sara", "Rita", "Filipa"] },
    mystery: { male: ["Salvador", "Vicente", "Eduardo", "Frederico", "Sebastião", "Xavier"], female: ["Camila", "Helena", "Cláudia", "Adelaide", "Eulália", "Branca"] },
  },
};

const DEFAULT_SEEDS = {
  English: {
    fantasy: "An ancient kingdom teeters on the edge of ruin as a forgotten evil stirs in the northern mountains.",
    scifi:   "A malfunctioning space station drifts toward a black hole while its crew uncovers a sinister conspiracy.",
    reality: "A chance discovery in a city alley pulls an ordinary person into a web of dangerous secrets.",
    mystery: "A locked-room murder at a remote estate — and every guest has something to hide.",
  },
  Hebrew: {
    fantasy: "ממלכה עתיקה ניצבת על סף חורבן בעוד רע נשכח מתעורר בהרי הצפון.",
    scifi:   "תחנת חלל תקולה נסחפת לעבר חור שחור בעוד צוותה חושף קונספירציה אפלה.",
    reality: "תגלית מקרית בסמטה עירונית גוררת אדם רגיל לרשת של סודות מסוכנים.",
    mystery: "רצח בחדר נעול באחוזה מבודדת — ולכל אורח יש משהו להסתיר.",
  },
  Arabic: {
    fantasy: "مملكة قديمة على شفا الانهيار بينما يستيقظ شر منسي في الجبال الشمالية.",
    scifi:   "محطة فضائية معطلة تنجرف نحو ثقب أسود بينما يكتشف طاقمها مؤامرة شريرة.",
    reality: "اكتشاف عرضي في زقاق المدينة يجرّ شخصاً عادياً إلى شبكة من الأسرار الخطرة.",
    mystery: "جريمة قتل في غرفة مغلقة بعزبة نائية — ولكل ضيف ما يخفيه.",
  },
  Portuguese: {
    fantasy: "Um reino antigo balança à beira da ruína enquanto um mal esquecido desperta nas montanhas do norte.",
    scifi:   "Uma estação espacial avariada deriva em direção a um buraco negro enquanto a sua tripulação descobre uma conspiração sinistra.",
    reality: "Uma descoberta casual num beco da cidade arrasta uma pessoa comum para uma teia de segredos perigosos.",
    mystery: "Um homicídio numa sala trancada de uma propriedade isolada — e cada hóspede tem algo a esconder.",
  },
};

const APPEARANCE_PARTS = {
  English: {
    body:    ["Athletic build", "Slim and wiry", "Stocky and muscular", "Tall and lean", "Average build", "Broad-shouldered", "Petite and nimble", "Short and sturdy"],
    hairLen: ["shaved head", "close-cropped hair", "short hair", "shoulder-length hair", "long hair", "flowing hair"],
    hairCol: ["black", "dark brown", "chestnut brown", "auburn", "dirty blonde", "blonde", "red", "silver", "white"],
    feature: [
      "a scar running across one cheek", "mismatched eye colors", "a small birthmark on the neck",
      "calloused and ink-stained hands", "a faded tattoo on the forearm", "unusually sharp cheekbones",
      "a distinctive hawkish nose", "a warm gap-toothed smile", "unsettlingly pale eyes", "a slight but permanent squint",
    ],
  },
  Hebrew: {
    body:    ["מבנה אתלטי", "רזה וגמיש", "חסון ושרירי", "גבוה ורזה", "מבנה ממוצע", "רחב כתפיים", "קטן וזריז", "נמוך ויציב"],
    hairLen: ["ראש מגולח", "שיער קצר מאוד", "שיער קצר", "שיער עד הכתפיים", "שיער ארוך", "שיער זורם"],
    hairCol: ["שחור", "חום כהה", "חום ערמוני", "אדמוני", "בלונדיני כהה", "בלונדיני", "אדום", "כסוף", "לבן"],
    feature: [
      "צלקת חוצה את הלחי", "עיניים בצבעים שונים", "כתם לידה קטן בצוואר",
      "ידיים מיובלות וכתומות דיו", "קעקוע דהוי על הזרוע", "עצמות לחיים חדות במיוחד",
      "אף נשרי בולט", "חיוך חמים עם רווח בין השיניים", "עיניים בהירות באופן מטריד", "פזילה קלה אך קבועה",
    ],
  },
  Arabic: {
    body:    ["بنية رياضية", "نحيل ورشيق", "ممتلئ وعضلي", "طويل ونحيل", "بنية متوسطة", "عريض المنكبين", "صغير ورشيق", "قصير ومتين"],
    hairLen: ["رأس محلوق", "شعر قصير جداً", "شعر قصير", "شعر إلى الكتفين", "شعر طويل", "شعر متموج"],
    hairCol: ["أسود", "بني داكن", "بني كستنائي", "أحمر مائل", "أشقر داكن", "أشقر", "أحمر", "فضي", "أبيض"],
    feature: [
      "ندبة تمتد عبر الخد", "عينان بلونين مختلفين", "وحمة صغيرة على الرقبة",
      "يدان خشنتان ملطختان بالحبر", "وشم باهت على الساعد", "عظام وجنتين حادة بشكل لافت",
      "أنف معقوف مميز", "ابتسامة دافئة مع فجوة بين الأسنان", "عينان شاحبتان بشكل مزعج", "ضيق خفيف دائم في العينين",
    ],
  },
  Portuguese: {
    body:    ["compleição atlética", "magro e ágil", "robusto e musculado", "alto e esguio", "compleição média", "ombros largos", "pequeno e ágil", "baixo e robusto"],
    hairLen: ["cabeça rapada", "cabelo bem curto", "cabelo curto", "cabelo até aos ombros", "cabelo comprido", "cabelo solto"],
    hairCol: ["preto", "castanho-escuro", "castanho-acastanhado", "ruivo-acastanhado", "louro-escuro", "louro", "ruivo", "prateado", "branco"],
    feature: [
      "uma cicatriz a atravessar uma das faces", "olhos de cores diferentes", "uma pequena marca de nascença no pescoço",
      "mãos calejadas e manchadas de tinta", "uma tatuagem desbotada no antebraço", "maçãs do rosto invulgarmente pronunciadas",
      "um nariz aquilino marcante", "um sorriso caloroso com um espaço entre os dentes", "olhos pálidos de forma perturbadora", "um olhar ligeiramente franzido permanente",
    ],
  },
};

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function namesFor(lang, genre) {
  const byLang = CHARACTER_NAMES[lang] || CHARACTER_NAMES.English;
  return byLang[genre] || byLang.fantasy;
}
function seedFor(lang, genre) {
  const byLang = DEFAULT_SEEDS[lang] || DEFAULT_SEEDS.English;
  return byLang[genre] || "";
}
function randomAppearanceStr(lang) {
  const parts = APPEARANCE_PARTS[lang] || APPEARANCE_PARTS.English;
  return `${pick(parts.body)}, ${pick(parts.hairCol)} ${pick(parts.hairLen)}, ${pick(parts.feature)}`;
}

// ─── MUSIC ─────────────────────────────────────────────────────
// HOW TO FILL IN TRACKS:
//   1. Go to https://pixabay.com/music/ and search each mood (e.g. "peaceful loop", "tense suspense")
//   2. Open a track page, right-click the play button → Inspect → Network tab → look for .mp3 request
//   3. Copy the full https://cdn.pixabay.com/audio/... URL and paste it below
const MUSIC_TRACKS = {
  peaceful:   "https://cdn.pixabay.com/download/audio/2023/05/16/audio_0636f970ca.mp3?filename=music_for_videos-sad-violin-150146.mp3",
  tense:      "https://cdn.pixabay.com/download/audio/2026/02/12/audio_7d514da87c.mp3?filename=delosound-background-music-483780.mp3",
  action:     "https://cdn.pixabay.com/download/audio/2025/10/06/audio_6718ad291f.mp3?filename=tatamusic-racing-speed-action-music-416097.mp3",
  dramatic:   "https://cdn.pixabay.com/download/audio/2025/10/06/audio_6718ad291f.mp3?filename=tatamusic-racing-speed-action-music-416097.mp3",
  sad:        "https://cdn.pixabay.com/download/audio/2023/05/16/audio_0636f970ca.mp3?filename=music_for_videos-sad-violin-150146.mp3",
  triumphant: "https://cdn.pixabay.com/download/audio/2026/02/18/audio_a52af36248.mp3?filename=sonican-victory-486914.mp3",
  mysterious: "https://cdn.pixabay.com/download/audio/2026/02/12/audio_7d514da87c.mp3?filename=delosound-background-music-483780.mp3",
  neutral:    "https://cdn.pixabay.com/download/audio/2026/02/12/audio_7d514da87c.mp3?filename=delosound-background-music-483780.mp3",
};

function crossfadeTo(url, targetVol, audioRef, currentUrlRef, fadeRef) {
  clearInterval(fadeRef.current);
  const prev = audioRef.current;

  // Fade out previous
  if (prev && !prev.paused) {
    let vol = prev.volume;
    fadeRef.current = setInterval(() => {
      vol = Math.max(0, vol - targetVol / 15);
      try { prev.volume = vol; } catch {}
      if (vol <= 0) {
        clearInterval(fadeRef.current);
        prev.pause();
      }
    }, 100);
  }

  // Start new track
  const audio = new Audio(url);
  audio.loop = true;
  audio.volume = 0;
  audioRef.current = audio;
  currentUrlRef.current = url;
  audio.play().catch(() => {}); // browser may block — silently ignore

  // Fade in
  let vol = 0;
  const timer = setInterval(() => {
    vol = Math.min(targetVol, vol + targetVol / 15);
    try { audio.volume = vol; } catch {}
    if (vol >= targetVol) clearInterval(timer);
  }, 100);
}

function useMusic(mood, volume, enabled) {
  const audioRef      = useRef(null);
  const currentUrlRef = useRef(null);
  const fadeRef       = useRef(null);

  useEffect(() => {
    if (!enabled) {
      // Fade out and pause when disabled
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        let v = audio.volume;
        const t = setInterval(() => {
          v = Math.max(0, v - 0.03);
          try { audio.volume = v; } catch {}
          if (v <= 0) { clearInterval(t); audio.pause(); }
        }, 100);
      }
      return;
    }
    const url = MUSIC_TRACKS[mood] || MUSIC_TRACKS.neutral;
    if (!url || url === currentUrlRef.current) return;
    crossfadeTo(url, volume, audioRef, currentUrlRef, fadeRef);
  }, [mood, volume, enabled]);

  // Resume correct volume when re-enabled
  useEffect(() => {
    if (enabled && audioRef.current && !audioRef.current.paused) {
      try { audioRef.current.volume = volume; } catch {}
    }
  }, [volume, enabled]);

  useEffect(() => () => {
    clearInterval(fadeRef.current);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
  }, []);
}

// ─── SHARED COMPONENTS ─────────────────────────────────────────
function FloatingParticles({ theme }) {
  if (!theme.particle) return null;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <span key={i} style={{
          position: "absolute", left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
          fontSize: `${8 + Math.random() * 14}px`, opacity: 0.08 + Math.random() * 0.12, color: theme.primary,
          animation: `float${i % 3} ${8 + Math.random() * 12}s ease-in-out infinite`, animationDelay: `${Math.random() * 5}s`,
        }}>{theme.particle}</span>
      ))}
    </div>
  );
}

function GenreIconStrip({ theme, genre }) {
  const names = genre && GENRE_ICONS[genre];
  if (!names) return null;
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 18, margin: "12px 0" }}>
      {names.map((n, i) => (
        <span key={i} style={{
          color: theme.primary, opacity: i === 0 ? 0.85 : 0.45, transition: "all 0.4s ease",
          display: "inline-flex", alignItems: "center",
        }}>
          <Icon name={n} size={i === 0 ? 26 : 20} strokeWidth={1.5} />
        </span>
      ))}
    </div>
  );
}

// ─── DICE ROLLER OVERLAY ────────────────────────────────────────
function DiceRoller({ theme, context, characterSkills, onResult, isRTL, t, mode, abilityScores }) {
  const DICE_FACES = ["", "⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];
  const isDnd = mode === "dnd";
  const [rolling, setRolling]       = useState(false);
  const [displayVal, setDisplayVal] = useState(null);
  const [finalVal, setFinalVal]     = useState(null);
  const [skillBonus, setSkillBonus] = useState(false);
  const [statBonus, setStatBonus]   = useState(0);

  const checkSkillRelevance = () => {
    if (!characterSkills?.length || !context) return false;
    const ctx = context.toLowerCase();
    return characterSkills.some(skill => {
      const s = skill.toLowerCase();
      if (ctx.includes(s)) return true;
      return s.split(/\s+/).some(w => w.length > 3 && ctx.includes(w));
    });
  };

  const handleRoll = () => {
    setRolling(true);
    setFinalVal(null);
    if (isDnd) {
      const bonus = getDndStatBonus(context, abilityScores);
      setStatBonus(bonus);
      setSkillBonus(false);
      let count = 0;
      const iv = setInterval(() => {
        setDisplayVal(Math.ceil(Math.random() * 20));
        count++;
        if (count >= 20) {
          clearInterval(iv);
          const raw = Math.ceil(Math.random() * 20);
          const final = Math.min(20, Math.max(1, raw + bonus));
          setDisplayVal(final);
          setFinalVal(final);
          setRolling(false);
        }
      }, 75);
    } else {
      const hasBonus = checkSkillRelevance();
      setSkillBonus(hasBonus);
      setStatBonus(0);
      let count = 0;
      const iv = setInterval(() => {
        setDisplayVal(Math.ceil(Math.random() * 6));
        count++;
        if (count >= 20) {
          clearInterval(iv);
          const r1 = Math.ceil(Math.random() * 6);
          const r2 = hasBonus ? Math.ceil(Math.random() * 6) : r1;
          const final = Math.max(r1, r2);
          setDisplayVal(final);
          setFinalVal(final);
          setRolling(false);
        }
      }, 75);
    }
  };

  const outcome = finalVal ? getDiceOutcome(finalVal, isDnd) : null;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      backdropFilter: "blur(8px)", direction: isRTL ? "rtl" : "ltr",
    }}>
      <div style={{
        background: theme.bgCard, border: `1px solid ${outcome ? outcome.color : theme.border}`,
        borderRadius: 20, padding: "36px 44px", maxWidth: 420, width: "90%",
        textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        transition: "border-color 0.5s ease",
      }}>
        <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>
          {t("fateCheck")}
        </div>
        <div style={{ fontFamily: theme.heading, color: theme.text, fontSize: 16, marginBottom: 28, lineHeight: 1.4, fontStyle: "italic" }}>
          "{context}"
        </div>

        {/* Dice display */}
        {isDnd ? (
          <div style={{
            margin: "0 0 20px",
            color: outcome ? outcome.color : theme.primary,
            transition: "color 0.5s ease",
            animation: rolling ? "diceRoll 0.12s ease-in-out infinite" : "none",
            filter: rolling ? "blur(2px)" : "none",
          }}>
            {displayVal != null
              ? <div style={{ fontFamily: theme.heading, fontSize: 80, lineHeight: 1 }}>{displayVal}</div>
              : <Icon name="dice" size={84} strokeWidth={1.2} />}
            {displayVal != null && (
              <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 13, marginTop: 4 }}>{displayVal} / 20</div>
            )}
          </div>
        ) : (
          <div style={{
            fontSize: 100, lineHeight: 1, margin: "0 0 20px",
            color: outcome ? outcome.color : theme.primary,
            transition: "color 0.5s ease",
            animation: rolling ? "diceRoll 0.12s ease-in-out infinite" : "none",
            filter: rolling ? "blur(2px)" : "none",
          }}>
            {displayVal ? DICE_FACES[displayVal] : <Icon name="dice" size={84} strokeWidth={1.2} />}
          </div>
        )}

        {/* Outcome label */}
        {outcome && (
          <div style={{
            background: outcome.bg, border: `1px solid ${outcome.color}50`,
            borderRadius: 10, padding: "10px 24px", marginBottom: 12,
            animation: "fadeIn 0.4s ease",
          }}>
            <div style={{ fontFamily: theme.heading, color: outcome.color, fontSize: 18, letterSpacing: 1.5, fontWeight: 700 }}>
              {t(outcome.labelKey)}
            </div>
            {!isDnd && (
              <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, marginTop: 4 }}>
                {displayVal} / 6
              </div>
            )}
          </div>
        )}

        {isDnd && finalVal && statBonus !== 0 && (
          <div style={{ fontFamily: theme.body, color: theme.secondary || "#4DB6AC", fontSize: 12, marginBottom: 14, opacity: 0.9, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="sparkle" size={13} /> {statBonus > 0 ? "+" : ""}{statBonus} ability modifier applied
          </div>
        )}
        {!isDnd && skillBonus && finalVal && (
          <div style={{ fontFamily: theme.body, color: theme.secondary || "#4DB6AC", fontSize: 12, marginBottom: 14, opacity: 0.9, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Icon name="sparkle" size={13} /> {t("skillBonusApplied")}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          {!finalVal ? (
            <button onClick={handleRoll} disabled={rolling} style={{
              background: rolling ? `${theme.border}88` : theme.primary,
              border: "none", borderRadius: 10, padding: "13px 36px",
              color: rolling ? theme.textMuted : theme.bg,
              fontFamily: theme.heading, fontSize: 15, fontWeight: 700,
              cursor: rolling ? "wait" : "pointer", letterSpacing: 1, transition: "all 0.2s",
            }}>
              {rolling ? t("rollingAnim") : t("rollBtn")}
            </button>
          ) : (
            <button
              onClick={() => onResult({ value: finalVal, outcome: t(outcome.labelKey), narrative: outcome.narrative, skillBonus, statBonus })}
              style={{
                background: outcome.color, border: "none", borderRadius: 10, padding: "13px 36px",
                color: "#000", fontFamily: theme.heading, fontSize: 15, fontWeight: 700,
                cursor: "pointer", letterSpacing: 1, transition: "all 0.2s",
              }}
            >
              {t("continueAfterRoll")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LANGUAGE MENU (dropdown) ───────────────────────────────────
function LangMenu({ value, onChange, theme, options, label, isRTL = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onEsc = e => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const current = options.find(o => o.code === value) || options[0];
  if (!current) return null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
      {label && (
        <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, letterSpacing: "0.02em" }}>
          {label}
        </span>
      )}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: compact ? "4px 10px" : "6px 12px",
          borderRadius: 999,
          background: open ? `${theme.primary}18` : "transparent",
          border: `1px solid ${open ? theme.primary : theme.border}`,
          color: theme.text,
          fontFamily: theme.body, fontSize: 12, cursor: "pointer",
          transition: "border-color 0.15s ease, background 0.15s ease",
          letterSpacing: "0.02em", whiteSpace: "nowrap",
        }}
      >
        {current.flag ? (
          <img
            src={flagSrc(current.flag)}
            srcSet={`${flagSrc(current.flag)} 1x, ${flagSrc2x(current.flag)} 2x`}
            alt=""
            width={18} height={13}
            style={{ borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.2)", display: "block", objectFit: "cover" }}
          />
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", color: theme.textMuted, opacity: 0.7 }}>
            <Icon name={current.icon || "close"} size={14} />
          </span>
        )}
        <span>{current.label}</span>
        <Icon name="chevronDown" size={12} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <ul role="listbox" style={{
          position: "absolute", top: "calc(100% + 6px)",
          [isRTL ? "right" : "left"]: 0,
          minWidth: "100%",
          zIndex: 100, listStyle: "none", margin: 0, padding: 4,
          background: theme.bgCard || theme.bg, border: `1px solid ${theme.border}`,
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        }}>
          {options.map(o => {
            const active = o.code === value;
            return (
              <li key={o.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => { onChange(o.code); setOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "6px 10px",
                    background: active ? `${theme.primary}22` : "transparent",
                    color: active ? theme.primary : theme.text,
                    border: "none", borderRadius: 6,
                    fontFamily: theme.body, fontSize: 13, cursor: "pointer",
                    textAlign: isRTL ? "right" : "left",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = theme.border; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  {o.flag ? (
                    <img
                      src={flagSrc(o.flag)}
                      srcSet={`${flagSrc(o.flag)} 1x, ${flagSrc2x(o.flag)} 2x`}
                      alt=""
                      width={18} height={13}
                      style={{ borderRadius: 2, boxShadow: "0 0 0 1px rgba(0,0,0,0.2)", objectFit: "cover" }}
                    />
                  ) : (
                    <span style={{ display: "inline-flex", alignItems: "center", width: 18, justifyContent: "center", color: theme.textMuted, opacity: 0.7 }}>
                      <Icon name={o.icon || "close"} size={14} />
                    </span>
                  )}
                  <span>{o.label}</span>
                  {active && <Icon name="check" size={12} style={{ marginInlineStart: "auto" }} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── WORD POPOVER (per-word translation tooltip) ───────────────
function WordPopover({ popover, onClose, theme, t, isRTL }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!popover) return;
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onEsc = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [popover, onClose]);
  if (!popover) return null;
  const { word, status, text, error, anchor, lang } = popover;
  // Position: just below the clicked word, horizontally centered. Clamp to viewport.
  const POP_W = 220;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  let left = anchor.left + anchor.width / 2 - POP_W / 2;
  if (left < 8) left = 8;
  if (left + POP_W > vw - 8) left = vw - 8 - POP_W;
  const top = anchor.bottom + 6;
  const targetIsRTL = RTL_LANGS.includes(lang);
  return (
    <div ref={ref} role="dialog" style={{
      position: "fixed", top, left, width: POP_W, zIndex: 1000,
      background: theme.bgCard || theme.bg, border: `1px solid ${theme.primary}55`,
      borderRadius: 10, padding: "10px 12px",
      boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
      fontFamily: theme.body,
      direction: isRTL ? "rtl" : "ltr",
    }}>
      <div style={{
        fontSize: 10, color: theme.textMuted, textTransform: "uppercase", letterSpacing: 1.2,
        marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6,
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <Icon name="speech" size={10} /> {lang}
        </span>
        <button
          onClick={onClose}
          aria-label={t("helpClose")}
          style={{ background: "transparent", border: "none", color: theme.textMuted, cursor: "pointer", padding: 0, lineHeight: 0 }}
        ><Icon name="close" size={11} /></button>
      </div>
      <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 2, fontStyle: "italic" }}>{word}</div>
      {status === "loading" && (
        <div style={{ fontSize: 13, color: theme.textMuted, fontStyle: "italic" }}>{t("wordTranslating")}</div>
      )}
      {status === "error" && (
        <div style={{ fontSize: 12, color: theme.accent || theme.primary }}>{error || t("wordError")}</div>
      )}
      {status === "ok" && (
        <div style={{ fontSize: 16, color: theme.text, fontWeight: 600, lineHeight: 1.3, direction: targetIsRTL ? "rtl" : "ltr", textAlign: targetIsRTL ? "right" : "left" }}>{text}</div>
      )}
    </div>
  );
}

// ─── SETUP COMPONENTS ───────────────────────────────────────────
function SetupCard({ theme, active, children, title, subtitle, isRTL, stepStrip, activePrimary }) {
  const titleColor = activePrimary || theme.primary;
  return (
    <div style={{
      background: theme.bgCard, backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
      borderRadius: 16, maxWidth: 560, width: "100%", margin: "0 auto", overflow: "hidden",
      opacity: active ? 1 : 0, transform: active ? "translateY(0) scale(1)" : "translateY(30px) scale(0.95)",
      transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)", position: active ? "relative" : "absolute",
      pointerEvents: active ? "auto" : "none", boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
      direction: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "left",
    }}>
      {stepStrip}
      <div style={{ padding: "26px 32px 32px" }}>
        {title    && <h2 style={{ fontFamily: theme.heading, color: titleColor, fontSize: 22, margin: "0 0 4px", letterSpacing: 1 }}>{title}</h2>}
        {subtitle && <p style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 14, margin: "0 0 24px" }}>{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}

function StepStrip({ step, selections, activePrimary, theme, t, onJump, isRTL, stepDefs }) {
  const defs = stepDefs || STEP_DEFS_ADVENTURE.map((s, i) => ({ ...s, key: SETUP_STEPS[i] }));
  return (
    <div style={{
      background: theme.bgSoft || `${theme.bg}cc`,
      borderBottom: `1px solid ${theme.border}`,
      padding: "10px 16px 8px",
      direction: isRTL ? "rtl" : "ltr",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${defs.length}, 1fr)`, gap: 2, marginBottom: 8 }}>
        {defs.map((s, i) => {
          const done    = selections[i] !== undefined && selections[i] !== "";
          const current = i === step;
          const iconCol = current ? activePrimary : done ? `${activePrimary}99` : theme.textMuted;
          const labelCol = current ? activePrimary : done ? `${activePrimary}88` : theme.textMuted;
          return (
            <button key={i} onClick={() => onJump(i)} title={t(s.labelKey)}
              style={{
                background: current ? `${activePrimary}22` : "transparent",
                border: `1px solid ${current ? activePrimary : done ? `${activePrimary}33` : "transparent"}`,
                borderRadius: 8, padding: "7px 2px 6px",
                cursor: "pointer", textAlign: "center", transition: "all 0.2s",
              }}>
              <div style={{
                display: "flex", justifyContent: "center", marginBottom: 2,
                color: iconCol, opacity: !done && !current ? 0.35 : 1,
                transition: "opacity 0.2s",
              }}>
                <Icon name={s.icon} size={15} strokeWidth={1.5} />
              </div>
              <div style={{
                fontFamily: theme.body, fontSize: 9, letterSpacing: 0.3,
                textTransform: "uppercase", lineHeight: 1.2, color: labelCol,
              }}>{t(s.labelKey)}</div>
              {done && (
                <div style={{
                  fontSize: 8, color: activePrimary, marginTop: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  maxWidth: "100%", padding: "0 2px",
                }}>{String(selections[i]).slice(0, 7)}</div>
              )}
            </button>
          );
        })}
      </div>
      <div style={{ height: 2, background: theme.border, borderRadius: 999, overflow: "hidden" }}>
        <div style={{
          height: "100%", background: activePrimary, borderRadius: 999,
          width: `${(step / (defs.length - 1)) * 100}%`,
          transition: "width 0.35s ease",
        }} />
      </div>
    </div>
  );
}

function OptionButton({ theme, selected, onClick, children, style = {} }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{
      background: selected ? `${theme.primary}22` : hovered ? `${theme.primary}0A` : "transparent",
      border: `1.5px solid ${selected ? theme.primary : theme.border}`, borderRadius: 10, padding: "14px 18px",
      color: selected ? theme.primary : theme.text, fontFamily: theme.body, fontSize: 15, cursor: "pointer",
      transition: "all 0.25s ease", textAlign: "inherit",
      boxShadow: selected ? `0 0 20px ${theme.primary}15` : "none", ...style,
    }}>{children}</button>
  );
}

function NavButtons({ theme, onBack, onNext, canNext = true, nextLabel, backLabel, showBack = true, isRTL }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ display: "flex", justifyContent: showBack ? "space-between" : "flex-end", marginTop: 28, gap: 12, direction: isRTL ? "rtl" : "ltr" }}>
      {showBack && (
        <button onClick={onBack} onMouseEnter={() => setHovered("back")} onMouseLeave={() => setHovered(null)} style={{
          background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 20px",
          color: theme.textMuted, fontFamily: theme.body, fontSize: 14, cursor: "pointer",
          opacity: hovered === "back" ? 1 : 0.7, transition: "all 0.2s",
        }}>{backLabel}</button>
      )}
      <button onClick={onNext} disabled={!canNext} onMouseEnter={() => setHovered("next")} onMouseLeave={() => setHovered(null)} style={{
        background: canNext ? (hovered === "next" ? theme.primary : `${theme.primary}DD`) : `${theme.border}55`,
        border: "none", borderRadius: 8, padding: "10px 28px",
        color: canNext ? theme.bg : theme.textMuted, fontFamily: theme.heading, fontSize: 14, fontWeight: 700,
        cursor: canNext ? "pointer" : "not-allowed", transition: "all 0.25s", letterSpacing: 1, textTransform: "uppercase",
      }}>{nextLabel}</button>
    </div>
  );
}

function SidebarActions({ theme, t, turnCount, isRTL, onSave, onExport, onQuit, onKey, musicEnabled, musicVolume, onMusicToggle, onVolumeChange }) {
  const userHasKey = hasUserKey();
  const free = FREE_TURN_LIMIT;
  const remaining = Math.max(0, free - turnCount);
  const btn = {
    display: "block", width: "100%", background: "transparent",
    border: `1px solid ${theme.border}`, borderRadius: 6, padding: "6px 10px",
    color: theme.textMuted, fontFamily: theme.heading, fontSize: 11,
    cursor: "pointer", letterSpacing: 0.5, textAlign: isRTL ? "right" : "left",
    transition: "all 0.2s", marginBottom: 5,
  };
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${theme.border}33` }}>
      {/* Turn counter */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
          {t("turn")} {turnCount}
        </span>
        <span style={{
          fontFamily: theme.body, fontSize: 11, fontWeight: 700,
          color: userHasKey ? (theme.secondary || "#4A7C3F") : remaining <= 3 ? theme.accent : theme.primary,
        }}>
          {userHasKey ? "∞" : `${remaining} / ${free}`}
        </span>
      </div>
      {/* Action buttons */}
      <button style={{ ...btn, display: "flex", alignItems: "center", gap: 8 }} onClick={onSave}
        onMouseOver={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
        onMouseOut={e  => { e.currentTarget.style.borderColor = theme.border;  e.currentTarget.style.color = theme.textMuted; }}>
        <Icon name="save" size={14} /> {t("saveGame")}
      </button>
      <button style={{ ...btn, display: "flex", alignItems: "center", gap: 8 }} onClick={onExport}
        onMouseOver={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
        onMouseOut={e  => { e.currentTarget.style.borderColor = theme.border;  e.currentTarget.style.color = theme.textMuted; }}>
        <Icon name="export" size={14} /> {t("exportStory")}
      </button>
      <button style={{ ...btn, display: "flex", alignItems: "center", gap: 8 }} onClick={onKey}
        onMouseOver={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
        onMouseOut={e  => { e.currentTarget.style.borderColor = theme.border;  e.currentTarget.style.color = theme.textMuted; }}>
        <Icon name="key" size={14} /> {userHasKey ? t("changeKey") : t("addYourKey")}
      </button>
      <button
        style={{ ...btn, display: "flex", alignItems: "center", gap: 8, marginBottom: 0, borderColor: `${theme.accent}50`, color: theme.accent }}
        onClick={onQuit}
        onMouseOver={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.opacity = "0.8"; }}
        onMouseOut={e  => { e.currentTarget.style.borderColor = `${theme.accent}50`; e.currentTarget.style.opacity = "1"; }}>
        <Icon name="door" size={14} /> {t("quitGame")}
      </button>
      {/* Music controls */}
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${theme.border}22`, display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={onMusicToggle}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 0, color: theme.primary, opacity: musicEnabled ? 1 : 0.4, transition: "opacity 0.2s" }}
          title={musicEnabled ? "Mute music" : "Unmute music"}>
          <Icon name={musicEnabled ? "music" : "muted"} size={16} />
        </button>
        <input
          type="range" min={0} max={1} step={0.05}
          value={musicVolume}
          onChange={e => onVolumeChange(parseFloat(e.target.value))}
          style={{ flex: 1, accentColor: theme.primary, cursor: "pointer", opacity: musicEnabled ? 0.8 : 0.3 }}
        />
      </div>
    </div>
  );
}

// ─── HELP MODAL ────────────────────────────────────────────────
function HelpModal({ theme, t, isRTL, onClose }) {
  const sections = [
    { titleKey: "helpWhatIs",   bodyKey: "helpWhatIsBody",   icon: "sparkle" },
    { titleKey: "helpHowTo",    body: null,                  icon: "clapper", steps: ["helpHowTo1", "helpHowTo2", "helpHowTo3"] },
    { titleKey: "helpDice",     bodyKey: "helpDiceBody",     icon: "dice" },
    { titleKey: "helpChapters", bodyKey: "helpChaptersBody", icon: "book" },
    { titleKey: "helpLearn",    bodyKey: "helpLearnBody",    icon: "speech" },
    { titleKey: "helpSaveLoad", bodyKey: "helpSaveLoadBody", icon: "save" },
    { titleKey: "helpFreemium", bodyKey: "helpFreemiumBody", icon: "key" },
    { titleKey: "helpOpenRouter", icon: "key", custom: "openrouter" },
  ];
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 950,
      padding: 16, direction: isRTL ? "rtl" : "ltr",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: 16, padding: "28px 32px", maxWidth: 680, width: "100%",
        maxHeight: "88vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        textAlign: isRTL ? "right" : "left",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 28, margin: 0, letterSpacing: 0.5 }}>
            {t("helpTitle")}
          </h2>
          <button onClick={onClose} aria-label={t("helpClose")} style={{
            background: "transparent", border: "none", color: theme.textMuted,
            cursor: "pointer", padding: "4px 8px", lineHeight: 0,
          }}><Icon name="close" size={20} /></button>
        </div>
        <p style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 14, margin: "0 0 20px" }}>
          {t("brandName")} · {t("homeTagline")}
        </p>
        {sections.map(s => (
          <section key={s.titleKey} style={{ marginBottom: 18, paddingBottom: 16, borderBottom: `1px solid ${theme.border}44` }}>
            <h3 style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 18, margin: "0 0 8px", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name={s.icon} size={18} />{t(s.titleKey)}
            </h3>
            {s.bodyKey && (
              <p style={{ fontFamily: theme.body, color: theme.text, fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                {t(s.bodyKey)}
              </p>
            )}
            {s.steps && (
              <ol style={{ fontFamily: theme.body, color: theme.text, fontSize: 14, lineHeight: 1.7, margin: "4px 0 0", paddingInlineStart: 22 }}>
                {s.steps.map(k => <li key={k} style={{ marginBottom: 4 }}>{t(k)}</li>)}
              </ol>
            )}
            {s.custom === "openrouter" && (
              <div style={{ fontFamily: theme.body, color: theme.text, fontSize: 14, lineHeight: 1.7 }}>
                <p style={{ margin: "0 0 10px" }}>{t("helpOpenRouterIntro")}</p>
                <p style={{ margin: "0 0 12px" }}>{t("helpOpenRouterWhy")}</p>
                <p style={{ margin: "0 0 6px", fontWeight: 600, color: theme.primary }}>{t("helpOpenRouterSteps")}</p>
                <ol style={{ margin: "0 0 12px", paddingInlineStart: 22 }}>
                  <li style={{ marginBottom: 4 }}>{t("keyStep1")}</li>
                  <li style={{ marginBottom: 4 }}>{t("keyStep2")}</li>
                  <li style={{ marginBottom: 4 }}>{t("keyStep3")}</li>
                </ol>
                <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  background: theme.primary, color: theme.bg, textDecoration: "none",
                  padding: "8px 16px", borderRadius: 8, fontFamily: theme.heading,
                  fontSize: 13, fontWeight: 700, letterSpacing: 0.4,
                }}>
                  <Icon name="sparkle" size={14} /> {t("helpOpenRouterVisit")}
                </a>
              </div>
            )}
          </section>
        ))}
        <button onClick={onClose} style={{
          marginTop: 8, background: theme.primary, border: "none", borderRadius: 10,
          padding: "12px 28px", color: theme.bg, fontFamily: theme.heading, fontSize: 14, fontWeight: 700,
          cursor: "pointer", letterSpacing: 0.5,
        }}>{t("helpClose")}</button>
      </div>
    </div>
  );
}

// ─── SETTINGS MODAL ────────────────────────────────────────────
function SettingsModal({ theme, t, isRTL, prefs, setPrefs, musicEnabled, setMusicEnabled, musicVolume, setMusicVolume, onClose }) {
  const Row = ({ label, children }) => (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontFamily: theme.heading, color: theme.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
  const Pill = ({ active, onClick, children }) => (
    <button onClick={onClick} style={{
      background: active ? theme.primary : "transparent",
      border: `1.5px solid ${active ? theme.primary : theme.border}`,
      color: active ? theme.bg : theme.text,
      borderRadius: 8, padding: "8px 14px", fontFamily: theme.body, fontSize: 13,
      cursor: "pointer", transition: "all 0.2s",
    }}>{children}</button>
  );
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 950,
      padding: 16, direction: isRTL ? "rtl" : "ltr",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: theme.bg, border: `1px solid ${theme.border}`,
        borderRadius: 16, padding: "28px 30px", maxWidth: 440, width: "100%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.6)", textAlign: isRTL ? "right" : "left",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h2 style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 24, margin: 0 }}>{t("settings")}</h2>
          <button onClick={onClose} aria-label={t("helpClose")} style={{
            background: "transparent", border: "none", color: theme.textMuted,
            cursor: "pointer", padding: "4px 8px", lineHeight: 0,
          }}><Icon name="close" size={18} /></button>
        </div>
        <p style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 13, margin: "0 0 22px" }}>
          {t("settingsSub")}
        </p>

        <Row label={t("theme_")}>
          <div style={{ display: "flex", gap: 8 }}>
            <Pill active={prefs.themeMode === "dark"}  onClick={() => setPrefs(p => ({ ...p, themeMode: "dark" }))}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="moon" size={14} /> {t("themeDark")}</span>
            </Pill>
            <Pill active={prefs.themeMode === "light"} onClick={() => setPrefs(p => ({ ...p, themeMode: "light" }))}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="sun" size={14} /> {t("themeLight")}</span>
            </Pill>
          </div>
        </Row>

        <Row label={t("fontFamily_")}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { v: "auto",     label: "Auto" },
              { v: "sans",     label: t("fontSans") },
              { v: "serif",    label: t("fontSerif") },
              { v: "mono",     label: t("fontMono") },
              { v: "dyslexic", label: t("fontDyslexic") },
            ].map(o => (
              <Pill key={o.v} active={prefs.font === o.v} onClick={() => setPrefs(p => ({ ...p, font: o.v }))}>
                {o.label}
              </Pill>
            ))}
          </div>
        </Row>

        <Row label={t("fontSize_")}>
          <div style={{ display: "flex", gap: 8 }}>
            {[["s","sizeS"],["m","sizeM"],["l","sizeL"],["xl","sizeXL"]].map(([v, k]) => (
              <Pill key={v} active={prefs.size === v} onClick={() => setPrefs(p => ({ ...p, size: v }))}>
                <span style={{ fontSize: v === "s" ? 11 : v === "m" ? 13 : v === "l" ? 15 : 17 }}>{t(k)}</span>
              </Pill>
            ))}
          </div>
        </Row>

        <Row label={t("music_")}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setMusicEnabled(v => !v)} style={{
              background: "transparent", border: `1.5px solid ${theme.border}`, borderRadius: 8,
              padding: "8px 14px", cursor: "pointer", color: theme.primary, lineHeight: 0,
            }}><Icon name={musicEnabled ? "music" : "muted"} size={16} /></button>
            <input type="range" min={0} max={1} step={0.05}
              value={musicVolume}
              onChange={e => setMusicVolume(parseFloat(e.target.value))}
              style={{ flex: 1, accentColor: theme.primary, cursor: "pointer", opacity: musicEnabled ? 1 : 0.4 }}
            />
            <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, minWidth: 30, textAlign: "right" }}>
              {Math.round(musicVolume * 100)}%
            </span>
          </div>
        </Row>
      </div>
    </div>
  );
}

function inputStyle(theme) {
  return {
    width: "100%", background: `${theme.bg}88`, border: `1px solid ${theme.border}`,
    borderRadius: 8, padding: "10px 12px", color: theme.text, fontFamily: theme.body,
    fontSize: 14, outline: "none", boxSizing: "border-box",
  };
}

// ─── EXPORT / SAVE / LOAD UTILITIES ───────────────────────────
function exportStoryAsText({ storyLog, config, character, stats, turnCount, gameOver, chapterNumber }) {
  const sep   = "═".repeat(42);
  const genre = config.genre ? config.genre.charAt(0).toUpperCase() + config.genre.slice(1) : "";
  const lines = [
    sep,
    `  ${character.name}'s ${genre} Adventure`,
    sep,
    `Character  : ${character.name}${character.gender ? ` (${character.gender}` : ""}${character.age ? `, age ${character.age}` : ""}${character.gender ? ")" : ""}`,
    `Genre      : ${config.genre}  |  Language: ${config.language}`,
    `Content    : ${config.ageTier}  |  Pacing: ${config.responseLength}`,
    `Perspective: ${config.perspective === "first" ? "First person (I)" : "Second person (You)"}`,
    `Death possible: ${config.deathPossible ? "Yes" : "No"}  |  Stats tracked: ${config.trackStats ? "Yes" : "No"}`,
    character.skills?.length ? `Skills     : ${character.skills.join(", ")}` : "",
    config.storyPrompt ? `Premise    : ${config.storyPrompt}` : "",
    `Exported   : ${new Date().toLocaleString()}`,
    sep, "",
  ].filter(l => l !== null);

  let turn = 0;
  storyLog.forEach(entry => {
    if (entry.role === "prologue" || entry.role === "closure") {
      lines.push("", `${"─".repeat(42)}`, entry.text, entry.solvedVia ? `  (${entry.solvedVia})` : "", `${"─".repeat(42)}`, "");
    } else if (entry.role === "chapter") {
      lines.push("", `${"─".repeat(42)}`, `  ${entry.text}`, `${"─".repeat(42)}`, "");
    } else if (entry.role === "roll") {
      lines.push(`[Fate Check: ${entry.context} — ${entry.value}/${config.mode === "dnd" ? 20 : 6} (${entry.outcome})${entry.skillBonus ? " ★ Skill Bonus" : ""}]`);
    } else if (entry.role === "narrator") {
      turn++;
      lines.push(`[Turn ${turn} — Narrator]`);
      lines.push(entry.text);
    } else {
      lines.push(`[Turn ${turn} — ${character.name}]`);
      lines.push(entry.text);
    }
    lines.push("");
  });

  if (gameOver) lines.push("*** ADVENTURE ENDED ***", "");

  if (config.trackStats) {
    lines.push(sep, "FINAL STATS", sep);
    lines.push(`Health    : ${stats.health}/100`);
    if (stats.inventory?.length) lines.push(`Inventory : ${stats.inventory.join(", ")}`);
    const rels = Object.entries(stats.relationships || {});
    if (rels.length) { lines.push("Relations :"); rels.forEach(([k, v]) => lines.push(`  ${k}: ${v}`)); }
    lines.push(sep);
  }
  return lines.join("\n");
}

function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// hintLevel is persisted from v4 on: it used to be a re-derivable view toggle,
// but it now records how many chapter approaches the player has unlocked —
// earned progress that would silently vanish on load.
function buildSavePayload({ config, character, stats, storyLog, choices, turnCount, gameOver, storySummary, worldState, chapterNumber, chapterBrief, chapterProgress, stuckTurns, hintLevel, storyBible }) {
  return {
    version: 5, savedAt: new Date().toISOString(),
    config, character, stats, storyLog, choices, turnCount, gameOver,
    storySummary, worldState, chapterNumber, chapterBrief, chapterProgress,
    stuckTurns, hintLevel, storyBible,
  };
}

function loadAndValidateSave(json) {
  const data = JSON.parse(json);
  if (!data.config || !data.character || !Array.isArray(data.storyLog))
    throw new Error("invalid");
  // Version 2 and 3 are supported; anything else (or missing) is rejected
  if (data.version !== undefined && data.version < 2)
    throw new Error("version");
  // Backfill fields added after v3 (modes)
  if (!data.config.mode) data.config.mode = "adventure";
  if (!data.character.abilityScores)
    data.character.abilityScores = { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 };
  if (data.character.dndRace === undefined) data.character.dndRace = "";
  if (data.character.dndClass === undefined) data.character.dndClass = "";
  if (!data.worldState) data.worldState = { npcs: {}, locations: [], facts: [] };
  // ── v4: config.storyLength (a TURN budget) → config.chapterCount (CHAPTERS) ──
  // These must never be confused: a v3 save's storyLength:20 means 20 turns /
  // 4 chapters, and reading it as 20 chapters would 5x the adventure.
  if (data.config.chapterCount === undefined) {
    data.config.chapterCount = LEGACY_CHAPTER_MAP[data.config.storyLength]
      || Math.max(1, Math.min(8, Math.round((data.config.storyLength || 10) / 5)));
  }
  // ── v4: chapterBrief {goal, obstacle} → {situation, winCondition, approaches} ──
  // Pre-v4 briefs have no predecided approaches; the hint ladder is simply empty
  // for the chapter in progress and correct from the next one on.
  if (data.chapterBrief && data.chapterBrief.winCondition === undefined) {
    const b = data.chapterBrief;
    data.chapterBrief = {
      title:        b.title || "",
      situation:    b.obstacle || b.goal || "",
      winCondition: b.goal || "",
      approaches:   [],
    };
  }
  if (data.stuckTurns === undefined) data.stuckTurns = 0;
  if (data.hintLevel  === undefined) data.hintLevel  = 0;
  // ── v5: story bible ── pre-v5 saves have none; the game runs unchaptered-arc
  // (buildSystemPrompt omits the bible block), which is exactly the old behaviour.
  if (data.storyBible === undefined) data.storyBible = null;
  return data;
}

// ─── MAIN APP ──────────────────────────────────────────────────
export default function AdventureGame() {
  const [phase, setPhase]           = useState("home");
  const [setupStep, setSetupStep]   = useState(0);
  const [stepSelections, setStepSelections] = useState({});
  const [config, setConfig]         = useState(() => ({ mode: "", genre: "", language: loadPrefs()?.language || "English", ageTier: "", responseLength: "", chapterCount: 0, deathPossible: null, trackStats: null, perspective: "second", storyPrompt: "" }));
  const [character, setCharacter]   = useState({ name: "", gender: "", age: "", appearance: "", skills: [], dndRace: "", dndClass: "", abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } });
  const [storyLog, setStoryLog]     = useState([]);
  const [stats, setStats]           = useState({ health: 100, inventory: [], relationships: {} });
  const [choices, setChoices]       = useState([]);
  const [loading, setLoading]       = useState(false);
  // Surfaced under the loading spinner during retries / fallback so the player
  // sees that the system is working, not stuck. { kind: "retry"|"fallback" } | null
  const [retryNotice, setRetryNotice] = useState(null);
  const [customAction, setCustomAction] = useState("");
  const [turnCount, setTurnCount]   = useState(0);
  const [gameOver, setGameOver]     = useState(false);
  const [storySummary, setStorySummary] = useState({ narrative: "", world: null });
  const [worldState, setWorldState]     = useState({ npcs: {}, locations: [], facts: [] });
  // Chapter system
  const [chapterNumber, setChapterNumber] = useState(1);
  const [chapterBrief, setChapterBrief]   = useState(null);
  const [chapterBanner, setChapterBanner] = useState(null); // string | null — shown as overlay
  // Dice system
  const [pendingRoll, setPendingRoll]         = useState(null); // { context, choiceText } | null
  const [nextRollRequired, setNextRollRequired] = useState({ required: false, context: "" });
  // Chapter progress — tracks partial goal completion within current chapter
  const [chapterProgress, setChapterProgress] = useState({ achieved: [], clues: [] });
  const [hintLevel, setHintLevel]           = useState(0); // how many of chapterBrief.approaches are revealed — resets on chapter transition
  const [stuckTurns, setStuckTurns]         = useState(0); // turns with no chapterProgress movement; at STUCK_TURNS_LIMIT the narrator must offer a costly way out
  const [briefStatus, setBriefStatus]       = useState("idle"); // "idle" | "loading" | "error" — gates input while the chapter brief lands
  const [storyBible, setStoryBible]         = useState(null); // the whole-arc plan; null = pre-bible save or generation failed (degrades to unchaptered)
  const [interlude, setInterlude]           = useState(null); // null | { kind: "advPrologue"|"chapterPrologue"|"closure", ready } — a reading card that replaces the choices panel
  const briefReqRef        = useRef(0);  // discards a brief that resolves after the player reset/loaded
  const lastSummaryCtxRef  = useRef(""); // lets the error panel re-issue the same brief request
  const pendingChapterRef  = useRef(null); // { chNum, brief, choices } staged while a prologue/closure card is being read
  const bibleRef           = useRef(null); // mirrors storyBible for same-tick reads (resolve → update → next chapter)
  const prepareArgsRef     = useRef(null); // last prepareChapter args, so the error panel can retry
  // Inline translations of narrator passages — keyed by storyLog index.
  // Shape: { [logIdx]: { lang, text, loading, error, picker } } — ephemeral, not saved.
  const [translations, setTranslations]     = useState({});
  // Per-word translation cache — keyed by `${targetLang}::${lowercasedWord}`. Persisted across sessions.
  const [wordCache, setWordCache]           = useState(() => loadWordCache());
  const [wordPopover, setWordPopover]       = useState(null); // { word, lang, anchor:DOMRect, status:"loading"|"ok"|"error", text? } | null
  // Per-passage gloss-all loading state, keyed by storyLog index.
  const [glossLoading, setGlossLoading]     = useState({});

  const [showKeyModal, setShowKeyModal]   = useState(false);
  const [keyModalContext, setKeyModalContext] = useState("game"); // "home" | "game"
  const [keyInput, setKeyInput]           = useState("");
  const [keyError, setKeyError]           = useState("");
  const [keyValidating, setKeyValidating] = useState(false);

  // Music state
  const [currentMood, setCurrentMood]     = useState("neutral");
  const [musicVolume, setMusicVolume]     = useState(0.4);
  const [musicEnabled, setMusicEnabled]   = useState(false);
  const hasInteracted = useRef(false);

  // User preferences (theme, font, size) — persisted to localStorage
  const [prefs, setPrefs] = useState(() => {
    const loaded = loadPrefs() || { themeMode: "dark", font: "auto", size: "m", language: "English", translationLanguage: "off", wordHintDismissed: false };
    if (loaded.translationLanguage === undefined) loaded.translationLanguage = "off";
    if (loaded.wordHintDismissed === undefined) loaded.wordHintDismissed = false;
    return loaded;
  });
  useEffect(() => { savePrefs(prefs); }, [prefs]);
  useEffect(() => { saveWordCache(wordCache); }, [wordCache]);
  const [showHelp, setShowHelp]         = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobile, setIsMobile]         = useState(() => typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useMusic(currentMood, musicVolume, musicEnabled && phase === "game");

  const storyEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const bannerTimerRef = useRef(null);
  // Long-press detection for batched-gloss-all on a narrator paragraph.
  const longPressTimer = useRef(null);
  const longPressed = useRef(false);

  const lang    = config.language;
  const isRTL   = RTL_LANGS.includes(lang);
  const isHebrew = lang === "Hebrew";
  const t = useCallback((key, replacements) => {
    let str = TR[key]?.[lang] || TR[key]?.English || key;
    if (replacements) Object.entries(replacements).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
    return str;
  }, [lang]);

  // Resolve theme: BRAND palette on home/setup-before-genre, genre theme during gameplay.
  // User prefs layer on top: light mode swaps bg/text, font pref overrides body font.
  const onBrandScreen = phase === "home" || (phase === "setup" && !config.genre);
  const brandPalette  = BRAND[prefs.themeMode === "light" ? "light" : "dark"];
  const genreTheme    = THEMES[config.genre] || THEMES.fantasy;
  const bodyFontOverride = prefs.font === "auto" ? null : FONT_STACKS[prefs.font].body;
  // Genre themes always layer on BRAND canvas — the stage is ink/ivory always,
  // genre only contributes accent colors and display font. No per-genre bg color.
  const theme = onBrandScreen
    ? {
        ...brandPalette,
        heading: "'Fraunces', 'Cormorant Garamond', serif",
        body:    bodyFontOverride || "'Inter', system-ui, sans-serif",
        displayFont: "'Fraunces', serif",
        displayItalic: false,
        icon:    null,
        particle:null,
        icons:   null,
      }
    : {
        ...brandPalette,
        ...genreTheme,
        bg:        brandPalette.bg,
        bgSoft:    brandPalette.bgSoft,
        bgCard:    brandPalette.bgCard,
        bgStory:   brandPalette.bgStory,
        text:      brandPalette.text,
        textMuted: brandPalette.textMuted,
        textDim:   brandPalette.textDim,
        border:    brandPalette.border,
        bgImage:   brandPalette.bgImage,
        body:      bodyFontOverride || genreTheme.body,
      };
  const storyFontSizePx = FONT_SIZES[prefs.size] || FONT_SIZES.m;
  const modeStepDefs    = getStepDefs(config.mode);
  const modeSetupSteps  = getSetupSteps(config.mode);
  const modeAutoAdvance = getAutoAdvanceSteps(config.mode);
  const currentStep     = modeSetupSteps[setupStep];
  const totalChapters = CHAPTER_COUNTS.includes(config.chapterCount) ? config.chapterCount : 1;

  const getSkillsDisplay = (genre) => isHebrew ? (GENRE_SKILLS[genre]?.he || []) : (GENRE_SKILLS[genre]?.en || []);
  const getSkillEN = (genre, displaySkill) => {
    const g = GENRE_SKILLS[genre];
    if (!g || !isHebrew) return displaySkill;
    const idx = g.he.indexOf(displaySkill);
    return idx >= 0 ? g.en[idx] : displaySkill;
  };

  useEffect(() => {
    if (storyEndRef.current) storyEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [storyLog, choices]);

  // ─── SYSTEM PROMPT ────────────────────────────────────────────
  // briefOverride/chapNumOverride exist because callers that have just awaited a
  // freshly generated brief cannot rely on the state update having landed yet
  // (same reason cfgOverride exists — see startAdventure).
  const buildSystemPrompt = useCallback((cfgOverride, charOverride, briefOverride, chapNumOverride, bibleOverride) => {
    const cfg   = cfgOverride  ?? config;
    const char  = charOverride ?? character;
    const brief = briefOverride ?? chapterBrief;
    const chNum = chapNumOverride ?? chapterNumber;
    const bible = bibleOverride ?? storyBible;
    const eLang       = cfg.language || "English";
    const eHebrew     = eLang === "Hebrew";
    const eRTL        = RTL_LANGS.includes(eLang);
    const ePortuguese = eLang === "Portuguese";

    const ageRules = {
      kids:  `Content suitable for children 8+. No violence beyond mild conflict. No romance. ` +
             `LANGUAGE LEVEL — BEGINNER READER in ${eLang}: use only common, everyday words a beginning reader of ${eLang} would know. ` +
             `Short sentences (6-10 words each), simple present/past tenses, concrete actions, no idioms or rare vocabulary. ` +
             `Prefer dialogue and clear cause-and-effect over abstract description. Choices must also be simple and short.`,
      teen:  "Content for ages 13+. Moderate action OK. Light romantic tension fine.",
      adult: "Content for 18+. Violence, complex themes, romance, sophisticated vocabulary all acceptable.",
    };
    const skillsEN = char.skills.map(s => {
      const g = GENRE_SKILLS[cfg.genre];
      if (!g || !eHebrew) return s;
      const idx = g.he.indexOf(s);
      return idx >= 0 ? g.en[idx] : s;
    });

    // Models don't reliably honour the "Name": "status string" shape — they often
    // return an object ({status, location, ...}) or a nested value instead. Left
    // raw, `${v}` renders "[object Object]", which then merges forward forever. Coerce.
    const asText = (v) => {
      if (typeof v === "string") return v;
      if (v == null) return "";
      if (Array.isArray(v)) return v.map(asText).filter(Boolean).join(", ");
      if (typeof v === "object") return Object.values(v).map(asText).filter(Boolean).join(" — ");
      return String(v);
    };

    // The throughline. Present on every in-chapter turn so the story pulls toward
    // one ending instead of drifting chapter to chapter. Only the spine + THIS
    // chapter's beat go in — past/future beats stay out to keep the prompt small.
    const currentBeat = bible?.chapters?.find(c => c.n === chNum)?.beat;
    const bibleSection = bible ? `
STORY (the arc this whole adventure is telling — never contradict it, always pull toward it):
Logline: ${bible.logline}
Central conflict: ${bible.centralConflict}
Antagonist: ${bible.antagonist?.name} — ${asText(bible.antagonist?.goal)}${bible.antagonist?.method ? ` (${asText(bible.antagonist.method)})` : ""}
Stakes: ${asText(bible.stakes)}
Heading toward: ${asText(bible.intendedEnding)}${currentBeat ? `
This chapter's role in the arc: ${currentBeat}` : ""}` : "";

    // The chapter is a contract: the situation holds the story in place until the
    // win condition is objectively met. `approaches` are for the narrator's eyes
    // only — the UI never renders them; they are what the player is solving for.
    const chapterSection = brief
      ? `CHAPTER ${chNum}${totalChapters > 1 ? ` of ${totalChapters}` : ""}: "${brief.title}"
SITUATION (unresolved — the story stays here until it is resolved): ${brief.situation}
WIN CONDITION: ${brief.winCondition}
VIABLE APPROACHES (never state these verbatim, never list them to the player — accept ANY action that genuinely achieves the win condition, whether listed here or not):
${(brief.approaches || []).map(a => `  - ${a}`).join("\n")}
→ Until the win condition is met: do NOT advance the main plot, do NOT introduce new locations, threads or goals unrelated to this situation, and end every turn with the situation still pressing. Detail, dialogue, character and atmosphere may develop freely — the PLOT may not.
→ If the player wanders off, let them, but narrate the pull back: the situation intrudes, an NPC redirects, or the stakes remind them.
→ Every turn, at least one choice must be a plausible move against this situation.
→ Set chapterSolved:true ONLY when the win condition is objectively, concretely met — not when the player merely intends, plans, or attempts it. Do not lower the bar because the player is struggling. State the approach used in solvedVia.`
      : "";

    const hasWorldState = Object.keys(worldState.npcs).length || worldState.locations.length || worldState.facts.length;
    const worldStateSection = hasWorldState ? `
WORLD STATE (persistent facts — always true, never contradict):${Object.keys(worldState.npcs).length ? `
NPCs: ${Object.entries(worldState.npcs).map(([k, v]) => `${k} (${asText(v)})`).join(" | ")}` : ""}${worldState.locations.length ? `
Locations: ${worldState.locations.map(asText).join(" | ")}` : ""}${worldState.facts.length ? `
Facts: ${worldState.facts.map(asText).join(" | ")}` : ""}` : "";

    const storyContextSection = storySummary.narrative ? `
STORY CONTEXT (events before recent turns — stay consistent, never contradict):
${storySummary.narrative}${storySummary.world?.npcs && Object.keys(storySummary.world.npcs).length ? `
NPCs: ${Object.entries(storySummary.world.npcs).map(([k, v]) => `${k} (${asText(v)})`).join(", ")}` : ""}${storySummary.world?.locations?.length ? `
Locations: ${storySummary.world.locations.map(asText).join(", ")}` : ""}${storySummary.world?.decisions?.length ? `
Key decisions: ${storySummary.world.decisions.map(asText).join("; ")}` : ""}${storySummary.world?.threads?.length ? `
Active threads: ${storySummary.world.threads.map(asText).join("; ")}` : ""}` : "";

    // Pacing is measured in CHAPTERS, never turns. A chapter lasts exactly as long
    // as it takes the player to solve it, so there is no turn budget to spend and
    // the story ends only when the final chapter's win condition is met.
    const isLastChapter = chNum >= totalChapters;
    const chapterPct = totalChapters > 1 ? (chNum - 1) / (totalChapters - 1) : 1;
    let phaseInstr;
    if (turnCount === 0)        phaseInstr = "PHASE — OPENING: Establish the world, the character's background, and drop the player straight into this chapter's situation.";
    else if (isLastChapter)     phaseInstr = "PHASE — CLIMAX: This is the final chapter. Bring every thread to a head. When this chapter's win condition is met, set BOTH chapterSolved:true and gameOver:true, and deliver a satisfying conclusion in the same turn.";
    else if (chNum === 1)       phaseInstr = "PHASE — EARLY: Develop the world and the cast while the player works on this chapter's situation.";
    else if (chapterPct < 0.65) phaseInstr = "PHASE — MIDDLE: Escalate. Consequences from earlier chapters resurface and raise the stakes of this situation.";
    else                        phaseInstr = "PHASE — LATE: Push toward the climax. Consequences mount and the story converges on its ending.";

    const isDnd = cfg.mode === "dnd";
    const isEducational = cfg.mode === "educational";

    const narratorPersona = isDnd
      ? `You are the Dungeon Master of a D&D 5e-inspired fantasy adventure.`
      : `You are the narrator of an interactive ${THEMES[cfg.genre]?.nameKey || "fantasy"} adventure game.`;

    const dndCharBlock = isDnd ? `
RACE: ${char.dndRace || "Human"}
CLASS: ${char.dndClass || "Fighter"}
ABILITY SCORES: ${DND_STATS.map(s => {
  const v = char.abilityScores?.[s] ?? 10;
  const m = Math.floor((v - 10) / 2);
  return `${s} ${v} (${m >= 0 ? "+" : ""}${m})`;
}).join(", ")}` : "";

    const rollInstruction = isDnd
      ? "rollRequired should be true for most meaningful actions — combat, ability checks, skill challenges, saving throws. Err on the side of requiring rolls."
      : "rollRequired: true when next action has meaningful risk (combat, stealth, locks, persuasion). False for safe/narrative choices.";

    const eduNote = isEducational
      ? "\nEDUCATIONAL: Use clear vocabulary suitable for language learners. Prefer common words over idioms or rare vocabulary. Keep sentences reasonably short."
      : "";

    return `${narratorPersona}
${worldStateSection}
LANGUAGE: Respond ENTIRELY in ${ePortuguese ? "European Portuguese (pt-PT, as spoken in Portugal — NOT Brazilian Portuguese; use words like 'ficheiro' not 'arquivo', 'ecrã' not 'tela', 'registar' not 'cadastrar', 'autocarro' not 'ônibus', 'telemóvel' not 'celular'; use 'tu' or 'você' forms consistent with Portugal usage; avoid gerund-continuous 'está fazendo' — prefer 'está a fazer')" : eLang}. ALL story text and choices must be in ${eLang}.

PERSPECTIVE: ${eHebrew
    ? 'כתוב בגוף שני. השתמש ב"אתה", "שלך". דוגמה: "אתה שולף את חרבך וצועד אל החשיכה."'
    : eRTL
      ? 'اكتب بضمير المخاطب. استخدم "أنت"، "لك". مثال: "تسلّ سيفك وتخطو نحو الظلام."'
      : ePortuguese
        ? 'Escreva em SEGUNDA PESSOA, português europeu. Use "tu" (formas do "tu" do Portugal) ou "você" conforme soar mais natural em Portugal, nunca formas brasileiras. Exemplo: "Desembainhas a tua espada e avanças para a escuridão."'
        : 'Write in SECOND PERSON. Use "you", "your". Example: "You draw your sword and step into the dark."'}

CHARACTER: Name: ${char.name || "The Adventurer"}, Gender: ${char.gender || "unspecified"}, Age: ${char.age || "unknown"}, Appearance: ${(char.appearance || "unspecified").replace(/\n+/g, ", ")}, Skills: ${skillsEN.join(", ") || "none"}${dndCharBlock}

CONTENT: ${ageRules[cfg.ageTier] || ageRules.teen}
LENGTH: Respond in 1-2 short sentences — point-and-click style. React to the player's SPECIFIC action and make clear, through what happens in the fiction, whether it moves toward the win condition or misses it. Never use a meter, never restate the whole situation, no long description. Keep momentum.${eduNote}
${cfg.deathPossible ? "DEATH IS POSSIBLE if very poor choices are made." : "DEATH IS NOT POSSIBLE. Failures redirect the story."}
${cfg.trackStats
  ? `TRACK STATS: Always return a "stats" object with the updated values. Current authoritative state — health: ${stats.health}/100, inventory: [${(stats.inventory || []).join(", ") || "empty"}], relationships: {${Object.entries(stats.relationships || {}).map(([k,v]) => `${k}: ${v}`).join(", ") || "none"}}. Carry these forward and modify based on events. Reduce health on dangerous failures.`
  : ""}
SKILLS: When situations relate to character skills, acknowledge the skill and give more favorable outcomes.
${cfg.storyPrompt ? `PREMISE: ${cfg.storyPrompt}` : "Create an original compelling opening."}
${bibleSection}
${storyContextSection}
${chapterSection}

STORY ARC: ${phaseInstr}

RESPOND WITH VALID JSON ONLY (no markdown fences):
{"story":"...","choices":["...","...","..."],${cfg.trackStats ? '"stats":{"health":100,"inventory":[],"relationships":{}},' : ''}"gameOver":false,"gameOverReason":"","rollRequired":false,"rollContext":"","chapterSolved":false,"solvedVia":"","chapterProgress":{"achieved":[],"clues":[]},"mood":"neutral","worldState":{"npcs":{},"locations":[],"facts":[]}}

${rollInstruction}
rollContext: Short phrase shown to player before rolling (e.g. "pick the ancient lock").
chapterSolved: true ONLY when the chapter's WIN CONDITION above is objectively met. Intending, planning or attempting it is NOT solving it. When in doubt, false.
solvedVia: when chapterSolved is true, one short phrase naming how the player actually did it. Empty otherwise.
chapterProgress: Update every turn — achieved: concrete milestones the player has completed toward the win condition (cumulative, carry forward); clues: information they have learned that helps reach it (cumulative). Only add an entry when something genuinely changed this turn — an empty list is correct when the player made no headway.
mood: Emotional tone of the story text just returned. One of: peaceful, tense, action, dramatic, sad, triumphant, mysterious, neutral.
worldState: Update every turn — carry ALL existing entries forward and add new ones.
  npcs: {"Name": "role/relationship — one-sentence current status"} — every character the player has met.
  locations: ["Place — brief note"] — every location visited or mentioned.
  facts: ["Established fact"] — key truths that affect the story. Keep to the 8 most important; drop least relevant when full.
Provide 2-5 meaningfully different choices. ALWAYS include at least 1 choice unless gameOver is true.
choices: an array of PLAIN STRINGS — the exact text of each option, nothing else. Never objects, never nested, never the outcome of a choice. Correct: ["open the door","wait"]. Wrong: [{"choice":"open the door","outcome":{...}}].
Return the JSON object above and nothing else — do not add fields, do not nest extra structure inside any field.`;
  }, [config, character, turnCount, storySummary, worldState, chapterBrief, chapterNumber, totalChapters, stats, storyBible]);

  // ─── API CALL ─────────────────────────────────────────────────
  const callAPI = useCallback(async (messages, opts = {}) => {
    try {
      const sysPrompt = opts.systemPrompt ?? buildSystemPrompt();
      // Only foreground turns surface the retry banner. Background calls
      // (summary, chapter brief, translation) bypass callAPI and call api.chat
      // directly without an onRetry — same retry logic, no UI.
      const onRetry = ({ willFallback }) => setRetryNotice({ kind: willFallback ? "fallback" : "retry" });
      // TURN_SCHEMA makes the provider enforce the turn shape. Background calls
      // (summary, brief, translation) have their own shapes and stay on
      // json_object — they can pass opts.schema if they ever need the same.
      const result = await api.chat(sysPrompt, messages, { schema: TURN_SCHEMA, ...opts, turnCount, onRetry });
      setRetryNotice(null);
      return result;
    } catch (err) {
      setRetryNotice(null);
      if (err.message === "__need_key__") {
        setKeyModalContext("game");
        setShowKeyModal(true);
        return null; // caller must handle null
      }
      console.error("API error:", err);
      const errorMsg = lang === "Hebrew" ? "משהו השתבש... נסה שוב." : lang === "Arabic" ? "حدث خطأ... حاول مرة أخرى." : lang === "Portuguese" ? "Algo deu errado... tente novamente." : "Something went wrong... try again.";
      const retryMsg = lang === "Hebrew" ? "נסה שוב" : lang === "Arabic" ? "حاول مرة أخرى" : lang === "Portuguese" ? "Tentar novamente" : "Try again";

      // A rate-limited key, an unfunded key and a malformed response all used to
      // collapse into the same generic string, which made every failure report
      // unactionable. Show what actually happened.
      const detail = err?.message ? `\n\n(${err.message})` : "";

      // 401/402/403 on the user-key path means the stored key itself is the
      // problem — a generic "try again" would loop forever, since every retry
      // reuses the same bad key. Send them to the key modal instead.
      if (hasUserKey() && /API error (401|402|403)\b/.test(err?.message || "")) {
        setKeyError(err.message);
        setKeyModalContext("game");
        setShowKeyModal(true);
        return null; // caller must handle null
      }

      return {
        story: errorMsg + detail,
        choices: [retryMsg],
        gameOver: false, rollRequired: false, rollContext: "", chapterSolved: false,
      };
    }
  }, [buildSystemPrompt, lang, turnCount]);

  // ─── PER-WORD TRANSLATION (educational mode) ──────────────────
  // Lazy single-word lookup. Cache hit → return immediately. Cache miss → small LLM call, cache result.
  const translateWord = useCallback(async (word, targetLang, context) => {
    const key = wordCacheKey(targetLang, word);
    if (wordCache[key]) return wordCache[key];
    const SYSTEM =
      `You are a precise translator. Translate the SINGLE word the user provides into ${targetLangLabel(targetLang)}, ` +
      `using the short context to pick the correct sense. Lowercase output unless it is a proper noun. ` +
      `RESPOND WITH VALID JSON ONLY: {"t":"the translation"}`;
    const payload = JSON.stringify({ w: word, c: context || "" });
    const result = await api.chat(SYSTEM, [{ role: "user", content: payload }], { max_tokens_override: 30, turnCount });
    const t = (result?.t || "").trim();
    if (!t) throw new Error("empty");
    setWordCache(prev => ({ ...prev, [key]: t }));
    return t;
  }, [wordCache, turnCount]);

  // Batched gloss for an entire passage. Sends only words not already cached. One LLM call per passage.
  const translateAllWords = useCallback(async (logIdx, passageText, targetLang) => {
    setGlossLoading(g => ({ ...g, [logIdx]: true }));
    try {
      const tokens = splitIntoTokens(passageText);
      const seen = new Set();
      const wordsToFetch = [];
      for (const tok of tokens) {
        if (tok.type !== "word") continue;
        const lower = tok.text.toLowerCase();
        if (seen.has(lower)) continue;
        seen.add(lower);
        if (!wordCache[wordCacheKey(targetLang, lower)]) wordsToFetch.push(lower);
      }
      if (wordsToFetch.length) {
        const SYSTEM =
          `You are a precise translator. Translate each word in the user's list into ${targetLangLabel(targetLang)}, ` +
          `using the surrounding passage to pick the correct sense for each. Lowercase output unless a word is a proper noun. ` +
          `RESPOND WITH VALID JSON ONLY: {"t":{"word1":"…","word2":"…"}}`;
        const payload = JSON.stringify({ words: wordsToFetch, context: passageText });
        const result = await api.chat(SYSTEM, [{ role: "user", content: payload }], { max_tokens_override: 1500, turnCount });
        const dict = result?.t || {};
        if (dict && typeof dict === "object") {
          setWordCache(prev => {
            const next = { ...prev };
            for (const w of wordsToFetch) {
              const v = dict[w];
              if (typeof v === "string" && v.trim()) next[wordCacheKey(targetLang, w)] = v.trim();
            }
            return next;
          });
        }
      }
    } catch (e) {
      console.warn("Gloss-all failed:", e);
    } finally {
      setGlossLoading(g => { const next = { ...g }; delete next[logIdx]; return next; });
    }
  }, [wordCache, turnCount]);

  // Handle clicking a single word — opens the popover, fills it from cache or via translateWord.
  const handleWordClick = useCallback((e, wordText, contextStr, targetLang) => {
    if (longPressed.current) { longPressed.current = false; return; }
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const lower = wordText.toLowerCase();
    const cached = wordCache[wordCacheKey(targetLang, lower)];
    if (cached) {
      setWordPopover({ word: wordText, anchor: rect, status: "ok", text: cached, lang: targetLang });
      return;
    }
    setWordPopover({ word: wordText, anchor: rect, status: "loading", lang: targetLang });
    translateWord(lower, targetLang, contextStr).then(text => {
      setWordPopover(prev => prev && prev.word === wordText && prev.anchor.top === rect.top ? { ...prev, status: "ok", text } : prev);
    }).catch(() => {
      setWordPopover(prev => prev && prev.word === wordText && prev.anchor.top === rect.top ? { ...prev, status: "error" } : prev);
    });
  }, [wordCache, translateWord]);

  // Long-press handlers: fire translateAllWords after 500ms hold, suppress the next click.
  const startLongPress = useCallback((logIdx, text, targetLang) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      longPressTimer.current = null;
      translateAllWords(logIdx, text, targetLang);
    }, 500);
  }, [translateAllWords]);
  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  // ─── INLINE TRANSLATION ───────────────────────────────────────
  const translatePassage = useCallback(async (logIdx, sourceText, targetLang) => {
    setTranslations(t => ({ ...t, [logIdx]: { ...(t[logIdx] || {}), lang: targetLang, loading: true, error: null, picker: false } }));
    try {
      const targetLabel = targetLang === "Portuguese"
        ? "European Portuguese (pt-PT, as spoken in Portugal — NOT Brazilian; use 'ficheiro' not 'arquivo', 'ecrã' not 'tela', 'está a fazer' not 'está fazendo')"
        : targetLang;
      const SYSTEM =
        `You are a precise translator. Translate the user's passage into ${targetLabel}. ` +
        `Preserve meaning, tone, names, and paragraph breaks. Do NOT add commentary or explanations. ` +
        `RESPOND WITH VALID JSON ONLY: {"text":"the translation"}`;
      const result = await api.chat(SYSTEM, [{ role: "user", content: sourceText }], { max_tokens_override: 800, turnCount });
      const translated = result?.text || "";
      if (!translated) throw new Error("empty");
      setTranslations(t => ({ ...t, [logIdx]: { lang: targetLang, text: translated, loading: false, error: null, picker: false } }));
    } catch (e) {
      console.warn("Translation failed:", e);
      setTranslations(t => ({ ...t, [logIdx]: { ...(t[logIdx] || {}), loading: false, error: true, picker: false } }));
    }
  }, [turnCount]);

  // ─── BACKGROUND SUMMARIZER ─────────────────────────────────────
  const triggerSummarize = useCallback(async (fullLog, currentSummary) => {
    const eLang = config.language || "English";
    const ePortuguese = eLang === "Portuguese";
    const langDirective = ePortuguese
      ? "European Portuguese (pt-PT, NOT Brazilian Portuguese)"
      : eLang;
    const SYSTEM =
      `You track story continuity for an interactive adventure game. Produce a compact JSON summary. ` +
      `LANGUAGE: Write every string value (narrative text, npc names, locations, decisions, threads) ENTIRELY in ${langDirective}. JSON keys stay in English; every value in ${eLang}.\n` +
      `RESPOND WITH VALID JSON ONLY:\n` +
      `{"narrative":"4-6 sentences in ${eLang} covering key events, character development, and current situation — enough for the narrator to stay fully consistent","world":{"npcs":{"Name":"relationship/status"},"locations":["place — notes"],"decisions":["decision made"],"threads":["active plot thread"]}}`;

    const parts = [];
    if (currentSummary.narrative) {
      parts.push(`PREVIOUS SUMMARY: ${currentSummary.narrative}`);
      if (currentSummary.world) parts.push(`WORLD STATE: ${JSON.stringify(currentSummary.world)}`);
      parts.push("NEW EVENTS TO INCORPORATE:");
      fullLog.slice(-(SUMMARY_EVERY * 2)).forEach(e => {
        if (e.role === "narrator") parts.push(`Narrator: ${e.text}`);
        else if (e.role === "player") parts.push(`Player: ${e.text}`);
      });
    } else {
      fullLog.forEach(e => {
        if (e.role === "narrator") parts.push(`Narrator: ${e.text}`);
        else if (e.role === "player") parts.push(`Player: ${e.text}`);
      });
    }

    try {
      const result = await api.chat(SYSTEM, [{ role: "user", content: parts.join("\n\n") }], { max_tokens_override: 700, turnCount });
      if (result?.narrative) setStorySummary(result);
    } catch (e) {
      console.warn("Summarization failed (non-critical):", e);
    }
  }, [turnCount, config.language]);

  // Portuguese needs a stronger directive to stay European rather than Brazilian.
  const langDirectiveFor = (eLang) => eLang === "Portuguese"
    ? "European Portuguese (pt-PT, as spoken in Portugal — NOT Brazilian Portuguese; use words like 'ficheiro' not 'arquivo', 'ecrã' not 'tela', 'autocarro' not 'ônibus', 'telemóvel' not 'celular')"
    : eLang;
  // Rich-prose length for prologues/closures, from the wizard's length step. The
  // in-chapter turns are always terse (see buildSystemPrompt); this is where the
  // length choice now actually shows up.
  const proseLenFor = (responseLength) => ({
    short:  "2-3 sentences",
    medium: "one rich paragraph (4-6 sentences)",
    long:   "2-3 rich, immersive paragraphs",
  }[responseLength] || "one rich paragraph (4-6 sentences)");

  // ─── STORY BIBLE GENERATOR ────────────────────────────────────
  // Authors the whole arc up front from the wizard input: central conflict,
  // antagonist, stakes, intended ending, and one beat per chapter. This is what
  // makes the adventure a plot rather than a run of unrelated situations.
  // Pure producer — returns bible or null.
  const generateStoryBible = useCallback(async (total, cfgOverride, charOverride) => {
    const cfg  = cfgOverride  ?? config;
    const char = charOverride ?? character;
    const genreLabel = THEMES[cfg.genre]?.nameKey || "fantasy";
    const eLang = cfg.language || "English";
    const langDirective = langDirectiveFor(eLang);
    const SYSTEM =
      `You are a story architect for an interactive ${genreLabel} adventure. Design the COMPLETE story arc up front, from the premise, as a bible the whole game will follow.\n` +
      `LANGUAGE: write every value ENTIRELY in ${langDirective}; JSON keys stay English.\n` +
      `Rules: "chapters" MUST have exactly ${total} entries, n = 1..${total} in order. Each "beat" is the ONE concrete thing that chapter accomplishes in the arc, each building on the previous. Chapter ${total}'s beat resolves the central conflict toward the intended ending. The antagonist is a concrete force with a name, a goal, and a current method (not an abstract theme). keyFigures are 2-4 recurring characters worth planting now. Keep every value tight — one or two sentences.`;
    const parts = [
      `Premise: ${cfg.storyPrompt || "(invent a compelling one for the genre)"}`,
      `Protagonist: ${char.name}${char.skills?.length ? `, skilled in ${char.skills.join(", ")}` : ""}.`,
      `Genre: ${genreLabel}. Chapters: ${total}.`,
    ];
    try {
      let r = await api.chat(SYSTEM, [{ role: "user", content: parts.join("\n") }], { max_tokens_override: 1800, turnCount: 0, schema: BIBLE_SCHEMA });
      if (Array.isArray(r) && r[0]) r = r[0];
      const chapters = Array.isArray(r?.chapters)
        ? r.chapters.filter(c => c && typeof c.beat === "string").map((c, i) => ({ n: i + 1, beat: c.beat }))
        : [];
      if (r?.logline && r?.centralConflict && r?.antagonist?.name && r?.intendedEnding && chapters.length) {
        // Trust the arc's own chapter count if it disagrees with `total`; the
        // beats are what matter and totalChapters is derived from config anyway.
        return {
          logline:         r.logline,
          centralConflict: r.centralConflict,
          antagonist:      { name: r.antagonist.name, goal: r.antagonist.goal || "", method: r.antagonist.method || "" },
          stakes:          r.stakes || "",
          keyFigures:      Array.isArray(r.keyFigures) ? r.keyFigures.filter(f => f?.name).map(f => ({ name: f.name, role: f.role || "" })) : [],
          intendedEnding:  r.intendedEnding,
          chapters,
        };
      }
      console.warn("Story bible: malformed shape", r);
      return null;
    } catch (e) {
      console.warn("Story bible generation failed:", e);
      return null;
    }
  }, [config, character]);

  // ─── CHAPTER GENERATOR (brief + prologue) ─────────────────────
  // One call produces both the hidden solving contract (brief) and the
  // player-facing prologue card + its opening choices. The brief REALIZES this
  // chapter's beat from the bible, so chapters serve the arc instead of being
  // freshly invented. Pure producer — returns { brief, prologueText, choices } | null.
  const generateChapter = useCallback(async (chNum, total, summaryContext, cfgOverride, charOverride, bibleOverride) => {
    const cfg   = cfgOverride  ?? config;
    const char  = charOverride ?? character;
    const bible = bibleOverride ?? bibleRef.current ?? storyBible;
    const genreLabel = THEMES[cfg.genre]?.nameKey || "fantasy";
    const eLang = cfg.language || "English";
    const langDirective = langDirectiveFor(eLang);
    const beat = bible?.chapters?.find(c => c.n === chNum)?.beat;
    const SYSTEM =
      `You are a story architect for an interactive ${genreLabel} adventure. Set up chapter ${chNum} of ${total}: a concrete SITUATION the player must solve, decided NOW, plus the player-facing prologue that opens it.\n` +
      `LANGUAGE: write every value ENTIRELY in ${langDirective}; JSON keys stay English.\n` +
      `Return two objects:\n` +
      `"brief" (the hidden solving contract):\n` +
      `  title: evocative chapter title (3-6 words).\n` +
      `  situation: 1-2 sentences — the specific, concrete predicament facing the player RIGHT NOW, here, in this place. A scene, not a theme.\n` +
      `  winCondition: ONE sentence naming the objectively checkable end-state that resolves it (answerable yes/no by looking at the world, e.g. 'Aran is inside the city walls'). Never a vague verb like 'investigate' on its own — name the STATE.\n` +
      `  approaches: 2-4 genuinely different concrete routes to the win condition. HIDDEN from the player.\n` +
      `"prologue" (what the player reads to open the chapter):\n` +
      `  text: ${proseLenFor(cfg.responseLength)} that drops the player into the situation and makes clear, in the fiction, what they must achieve here and hints at how — WITHOUT listing the approaches. Rich and atmospheric.\n` +
      `  choices: 2-5 concrete opening actions (plain strings), each a real move on the situation.\n` +
      `The situation and winCondition must match, and both must realize this chapter's role in the arc.`;
    const parts = [
      bible ? `STORY BIBLE: ${JSON.stringify({ logline: bible.logline, centralConflict: bible.centralConflict, antagonist: bible.antagonist, stakes: bible.stakes, intendedEnding: bible.intendedEnding })}` : "",
      beat ? `THIS CHAPTER'S BEAT (what it must accomplish in the arc): ${beat}` : "",
      `Character: ${char.name}${char.skills?.length ? `, skilled in ${char.skills.join(", ")}` : ""}.`,
      cfg.storyPrompt ? `Premise: ${cfg.storyPrompt}` : "",
      summaryContext ? `Story so far: ${summaryContext}` : "This is the very beginning of the adventure.",
      `${chNum === 1 ? "Opening chapter — establish the world and the first concrete predicament." : chNum === total ? "Final chapter — its situation resolves the whole story." : "Build on events so far; escalate."}`,
    ].filter(Boolean);
    try {
      let r = await api.chat(SYSTEM, [{ role: "user", content: parts.join("\n") }], { max_tokens_override: 1300, turnCount: 0, schema: CHAPTER_SCHEMA });
      if (Array.isArray(r) && r[0]) r = r[0];
      const b = r?.brief, p = r?.prologue;
      const approaches = Array.isArray(b?.approaches) ? b.approaches.filter(a => typeof a === "string" && a.trim()) : [];
      const choices    = Array.isArray(p?.choices)    ? p.choices.filter(c => typeof c === "string" && c.trim())    : [];
      if (b?.title && b?.situation && b?.winCondition && approaches.length >= 1 && p?.text) {
        return {
          brief: { title: b.title, situation: b.situation, winCondition: b.winCondition, approaches: approaches.slice(0, 4) },
          prologueText: p.text,
          choices: choices.length ? choices.slice(0, 5) : [t("continue_")],
        };
      }
      console.warn("Chapter generation: malformed shape", r);
      return null;
    } catch (e) {
      console.warn("Chapter generation failed:", e);
      return null;
    }
  }, [config, character, storyBible, t]);

  // ─── CHAPTER RESOLVE (closure + bounded bible update) ─────────
  // On solve: a rich closure card for the player + advisory downstream tweaks to
  // the bible. clampBibleUpdate decides what actually changes. Returns
  // { closureText, update } | null.
  const resolveChapter = useCallback(async (chNum, total, whatHappened, cfgOverride, bibleOverride) => {
    const cfg   = cfgOverride  ?? config;
    const bible = bibleOverride ?? bibleRef.current ?? storyBible;
    const genreLabel = THEMES[cfg.genre]?.nameKey || "fantasy";
    const eLang = cfg.language || "English";
    const langDirective = langDirectiveFor(eLang);
    const isLast = chNum >= total;
    const SYSTEM =
      `You are the story architect maintaining the bible for a ${genreLabel} adventure. The player just SOLVED chapter ${chNum} of ${total}.\n` +
      `LANGUAGE: write every value ENTIRELY in ${langDirective}; JSON keys stay English.\n` +
      `closureText: ${proseLenFor(cfg.responseLength)} — a satisfying closure of THIS chapter that reflects how the player actually solved it and points toward what's coming.${isLast ? " This is the FINAL chapter: make it the ending of the whole story." : ""}\n` +
      `Then propose SMALL downstream adjustments, changing as little as the player's actions truly require. You may adjust: the antagonist's goal and method, the stakes, the intended ending, and the beats of chapters AFTER ${chNum}. NEVER restate or change chapter ${chNum} or earlier. futureChapters: entries with n > ${chNum} only (may be empty if nothing needs to change).`;
    const parts = [
      bible ? `CURRENT BIBLE: ${JSON.stringify(bible)}` : "",
      `WHAT HAPPENED IN CHAPTER ${chNum}: ${whatHappened}`,
    ].filter(Boolean);
    try {
      let r = await api.chat(SYSTEM, [{ role: "user", content: parts.join("\n") }], { max_tokens_override: 1200, turnCount: 0, schema: RESOLVE_SCHEMA });
      if (Array.isArray(r) && r[0]) r = r[0];
      if (r?.closureText) return { closureText: r.closureText, update: r };
      console.warn("Chapter resolve: malformed shape", r);
      return null;
    } catch (e) {
      console.warn("Chapter resolve failed:", e);
      return null;
    }
  }, [config, storyBible]);

  // ─── CHAPTER PREPARE ──────────────────────────────────────────
  // Generates (with retries) the next chapter but does NOT commit it to play —
  // the prologue card is read first, then enterChapter() commits on Continue.
  // Sets briefStatus for the blocking spinner / error panel. Returns the prepared
  // chapter { chNum, brief, prologueText, choices } | null.
  const prepareChapter = useCallback(async (chNum, total, summaryCtx, cfgOv, charOv, bibleOv) => {
    const req = ++briefReqRef.current;
    lastSummaryCtxRef.current = summaryCtx;
    prepareArgsRef.current = { chNum, total, summaryCtx, cfgOv, charOv, bibleOv }; // for the error-panel retry
    setBriefStatus("loading");
    for (let attempt = 1; attempt <= BRIEF_MAX_ATTEMPTS; attempt++) {
      const prepared = await generateChapter(chNum, total, summaryCtx, cfgOv, charOv, bibleOv);
      if (req !== briefReqRef.current) return null;  // superseded by reset/load
      if (prepared) {
        setBriefStatus("idle");
        return { chNum, ...prepared };
      }
    }
    if (req === briefReqRef.current) setBriefStatus("error");
    return null;
  }, [generateChapter]);

  // ─── ADVENTURE PROLOGUE ───────────────────────────────────────
  // The opening card: draws the player into the world and the plot, from the
  // bible. Rich. Returns text or null. Not a substitute for chapter 1's prologue.
  const generateAdventurePrologue = useCallback(async (cfgOverride, charOverride, bibleOverride) => {
    const cfg   = cfgOverride  ?? config;
    const char  = charOverride ?? character;
    const bible = bibleOverride ?? bibleRef.current ?? storyBible;
    const genreLabel = THEMES[cfg.genre]?.nameKey || "fantasy";
    const eLang = cfg.language || "English";
    const langDirective = langDirectiveFor(eLang);
    const SYSTEM =
      `You are the narrator opening an interactive ${genreLabel} adventure. Write the PROLOGUE that draws the player into the world and the story about to unfold.\n` +
      `LANGUAGE: write ENTIRELY in ${langDirective}.\n` +
      `PERSPECTIVE: second person ("you").\n` +
      `text: ${proseLenFor(cfg.responseLength)} — establish who ${char.name} is, the world and its tone, and the central tension that sets the story in motion. Atmospheric and inviting. Do NOT resolve anything and do NOT present choices — this only sets the stage.`;
    const parts = [
      bible ? `STORY BIBLE: ${JSON.stringify({ logline: bible.logline, centralConflict: bible.centralConflict, antagonist: bible.antagonist, stakes: bible.stakes })}` : "",
      `Protagonist: ${char.name}${char.skills?.length ? `, skilled in ${char.skills.join(", ")}` : ""}. Age ${char.age || "unknown"}.`,
      cfg.storyPrompt ? `Premise: ${cfg.storyPrompt}` : "",
    ].filter(Boolean);
    try {
      let r = await api.chat(SYSTEM, [{ role: "user", content: parts.join("\n") }], { max_tokens_override: 900, turnCount: 0, schema: TEXT_SCHEMA });
      if (Array.isArray(r) && r[0]) r = r[0];
      return typeof r?.text === "string" && r.text.trim() ? r.text : null;
    } catch (e) {
      console.warn("Adventure prologue failed:", e);
      return null;
    }
  }, [config, character, storyBible]);

  // Commit a prepared chapter into play: install its brief, reset per-chapter
  // state, and make its opening choices active. Called when the player continues
  // past the chapter prologue card.
  const enterChapter = useCallback((prepared) => {
    if (!prepared) return;
    setChapterNumber(prepared.chNum);
    setChapterBrief(prepared.brief);
    setChapterProgress({ achieved: [], clues: [] });
    setStuckTurns(0);
    setHintLevel(0);                 // new chapter — approaches hidden again
    setChoices(prepared.choices || []);
    setBriefStatus("idle");
    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    setChapterBanner(prepared.brief.title);
    bannerTimerRef.current = setTimeout(() => setChapterBanner(null), 5000);
  }, []);

  // ─── KEY SETUP ────────────────────────────────────────────────
  const handleValidateKey = async () => {
    setKeyError("");
    setKeyValidating(true);
    try {
      await api.validateKey(keyInput);
      saveUserKey(keyInput);
      setKeyInput("");
      setShowKeyModal(false);
    } catch (err) {
      setKeyError(err.message);
    } finally {
      setKeyValidating(false);
    }
  };

  // ─── START ADVENTURE ──────────────────────────────────────────
  const startAdventure = async () => {
    // ── Apply defaults for any unset fields ──
    const names   = namesFor(lang, config.genre);
    const isMale  = Math.random() < 0.5;
    const allSkillsEN = GENRE_SKILLS[config.genre]?.en || [];
    const shuffled = [...allSkillsEN].sort(() => Math.random() - 0.5);

    const finalChar = {
      name:       character.name.trim()    || pick(isMale ? names.male : names.female),
      gender:     character.gender         || (isMale ? "male" : "female"),
      age:        character.age.trim()     || String(Math.floor(Math.random() * 61) + 6),
      appearance: character.appearance.trim() || randomAppearanceStr(lang),
      skills:     character.skills.length >= 2 ? character.skills : shuffled.slice(0, 2),
      dndRace:       character.dndRace   || "Human",
      dndClass:      character.dndClass  || "Fighter",
      abilityScores: character.abilityScores,
    };

    const isDndMode = config.mode === "dnd";
    const finalCfg = {
      ...config,
      ageTier:        config.ageTier        || "teen",
      responseLength: isDndMode ? "medium" : (config.responseLength  || "short"),
      // Fallback 1, matching the old behaviour: the unset default was never a
      // valid length either, and fell through to the shortest adventure.
      chapterCount:   CHAPTER_COUNTS.includes(config.chapterCount) ? config.chapterCount : 1,
      deathPossible:  isDndMode ? true  : (config.deathPossible  ?? false),
      trackStats:     isDndMode ? true  : (config.trackStats     ?? false),
      perspective:    config.perspective    || "second",
      storyPrompt:    config.storyPrompt.trim() || seedFor(lang, config.genre),
    };

    // Update state so the rest of the session (makeChoice, saves, etc.) uses final values
    setConfig(finalCfg);
    setCharacter(finalChar);
    setPhase("game");
    setLoading(true);

    const finalTotalChapters = finalCfg.chapterCount;

    // 1) The whole-arc bible, up front — chapters and prologues all serve it.
    //    Degrades gracefully to null (unchaptered plot) if generation fails.
    let bible = null;
    for (let attempt = 1; attempt <= BRIEF_MAX_ATTEMPTS && !bible; attempt++) {
      bible = await generateStoryBible(finalTotalChapters, finalCfg, finalChar);
    }
    bibleRef.current = bible;
    setStoryBible(bible);

    // 2) The adventure prologue card — world + plot. First thing the player reads.
    const advText = await generateAdventurePrologue(finalCfg, finalChar, bible);
    setStoryLog([{ role: "prologue", kind: "adventure", text: advText || finalCfg.storyPrompt }]);
    setTurnCount(1);                       // the opening is consumed by the prologue cards
    setCurrentMood("mysterious");
    setInterlude({ kind: "advPrologue", ready: false });
    setLoading(false);

    // 3) Prepare chapter 1 in the background while the player reads card 1; the
    //    card's Continue enables when it's ready.
    pendingChapterRef.current = null;
    prepareChapter(1, "", finalCfg, finalChar, finalTotalChapters, bible).then(prep => {
      pendingChapterRef.current = prep;
      setInterlude(i => (i && i.kind === "advPrologue") ? { ...i, ready: !!prep } : i);
    });
  };

  // ─── INTERLUDE (reading cards between play) ────────────────────
  // Pushes a chapter prologue card and stashes the prepared chapter for Continue.
  const showChapterPrologue = (prepared) => {
    pendingChapterRef.current = prepared;
    setStoryLog(prev => [...prev, { role: "prologue", kind: "chapter", text: prepared.prologueText, num: prepared.chNum }]);
    setInterlude({ kind: "chapterPrologue", ready: true });
  };

  // Continue button on any interlude card. What it does depends on which card.
  const handleContinue = () => {
    if (!interlude || interlude.ready === false) return;
    if (interlude.kind === "closure" && interlude.final) {
      // The final chapter's closure IS the ending.
      setInterlude(null);
      setChoices([]);
      setGameOver(true);
    } else if (interlude.kind === "advPrologue" || interlude.kind === "closure") {
      // Move from a prologue/closure card into the next chapter's prologue card.
      const prep = pendingChapterRef.current;
      if (!prep) { setBriefStatus("error"); return; }  // shouldn't happen (Continue gated on ready)
      showChapterPrologue(prep);
    } else if (interlude.kind === "chapterPrologue") {
      // Begin play: commit the chapter and surface its opening choices.
      enterChapter(pendingChapterRef.current);
      pendingChapterRef.current = null;
      setInterlude(null);
    }
  };

  // Re-issue the last chapter preparation after a failure, then unblock whatever
  // card was waiting on it. Backs the error panel's "try again".
  const retryPrepare = () => {
    const a = prepareArgsRef.current;
    if (!a) { setBriefStatus("idle"); return; }
    prepareChapter(a.chNum, a.total, a.summaryCtx, a.cfgOv, a.charOv, a.bibleOv).then(prep => {
      pendingChapterRef.current = prep;
      setInterlude(i => i ? { ...i, ready: !!prep } : i);
    });
  };

  // ─── CHOICE CLICK (checks for dice) ──────────────────────────
  const handleChoiceClick = (choiceText) => {
    if (loading || gameOver) return;
    if (nextRollRequired.required) {
      setPendingRoll({ context: nextRollRequired.context, choiceText });
    } else {
      makeChoice(choiceText, null);
    }
  };

  // ─── DICE RESULT → PROCEED ────────────────────────────────────
  const handleRollResult = (rollInfo) => {
    const choiceText = pendingRoll.choiceText;
    setPendingRoll(null);
    makeChoice(choiceText, rollInfo);
  };

  // ─── MAKE CHOICE ──────────────────────────────────────────────
  const makeChoice = async (choiceText, rollInfo = null) => {
    if (loading || gameOver) return;
    setLoading(true);

    // Append player entry and optional roll entry to log
    const rollEntry = rollInfo ? {
      role: "roll", value: rollInfo.value, outcome: rollInfo.outcome,
      context: rollInfo.context || pendingRoll?.context || "",
      skillBonus: rollInfo.skillBonus,
    } : null;

    setStoryLog(prev => [
      ...prev,
      { role: "player", text: choiceText },
      ...(rollEntry ? [rollEntry] : []),
    ]);
    setChoices([]);

    // Build LLM history — skip roll/chapter entries, and strip error/retry pairs
    const ERROR_MARKERS = ["Something went wrong", "משהו השתבש", "حدث خطأ", "Algo deu errado"];
    const RETRY_TEXTS   = ["Try again", "נסה שוב", "حاول مرة أخرى", "Tentar novamente"];
    // prologue entries are narration the player read — include them as context so
    // in-chapter turns continue the scene the prologue set. closure/chapter markers
    // stay display-only (the summary + next brief carry the handoff instead).
    const rawForHistory = storyLog.filter(e => e.role === "narrator" || e.role === "player" || e.role === "prologue");
    const logForHistory = rawForHistory.filter(e => {
      if (e.role === "narrator" && ERROR_MARKERS.some(m => e.text.includes(m))) return false;
      if (e.role === "player" && RETRY_TEXTS.includes(e.text)) return false;
      return true;
    });
    const isNarr = (e) => e.role === "narrator" || e.role === "prologue";

    // If this is a retry, find the last real player action and resend that instead
    const isRetry = RETRY_TEXTS.includes(choiceText);
    const priorPlayerActions = logForHistory.filter(e => e.role === "player");
    const effectiveChoice = isRetry
      ? (priorPlayerActions.at(-1)?.text ?? null)  // null = opening-turn retry, no prior action exists
      : choiceText;

    let history;
    if (storySummary.narrative && logForHistory.length > WINDOW_SIZE) {
      let windowLog = logForHistory.slice(-WINDOW_SIZE);
      const firstPlayer = windowLog.findIndex(e => e.role === "player");
      if (firstPlayer > 0) windowLog = windowLog.slice(firstPlayer);
      history = [];
      for (const entry of windowLog) {
        if (isNarr(entry)) history.push({ role: "assistant", content: JSON.stringify({ story: entry.text, choices: [] }) });
        else history.push({ role: "user", content: `Player chose: "${entry.text}"` });
      }
      // Ensure the first message is from user (required by most LLM APIs)
      if (history.length > 0 && history[0].role === "assistant") {
        history.unshift({ role: "user", content: "[story continues]" });
      }
    } else {
      history = [{ role: "user", content: `Begin the adventure with an opening covering ${character.name}'s background, the world, and the current situation.` }];
      for (const entry of logForHistory) {
        if (isNarr(entry)) history.push({ role: "assistant", content: JSON.stringify({ story: entry.text, choices: [] }) });
        else history.push({ role: "user", content: `Player chose: "${entry.text}"` });
      }
    }

    // Append player choice as last user message.
    // effectiveChoice is null only when retrying the opening turn (no prior player actions) —
    // in that case the opening "Begin the adventure..." message is already the last entry in history.
    if (effectiveChoice !== null) {
      let lastMsg = `Player chose: "${effectiveChoice}"`;

      // Inject authoritative current state so LLM never has to infer from trimmed history
      const stateLines = [];
      if (config.trackStats) {
        stateLines.push(`Health: ${stats.health}/100`);
        if (stats.inventory?.length) stateLines.push(`Inventory: [${stats.inventory.join(", ")}]`);
        const rels = Object.entries(stats.relationships || {});
        if (rels.length) stateLines.push(`Relationships: {${rels.map(([k,v]) => `${k}: ${v}`).join(", ")}}`);
      }
      if (chapterBrief) {
        if (chapterProgress.achieved.length) stateLines.push(`Chapter achieved so far: ${chapterProgress.achieved.join("; ")}`);
        if (chapterProgress.clues.length)    stateLines.push(`Clues found: ${chapterProgress.clues.join("; ")}`);
        // The costly out lives here rather than the system prompt: it is derived
        // from chapterProgress (which belongs only in [CURRENT STATE]), and it
        // keeps the system prompt identical turn to turn.
        if (stuckTurns >= STUCK_TURNS_LIMIT) {
          stateLines.push(
            `STUCK: ${stuckTurns} turns without progress. This turn you MUST include exactly one choice that genuinely solves or bypasses the situation at a concrete, stated price — health lost, an item given up or destroyed, an NPC turned hostile, or a secret surrendered. Name the price in the choice text. Do not offer it for free, and do not apply the price unless the player picks it.`
          );
        }
      }
      if (stateLines.length) {
        lastMsg += `\n\n[CURRENT STATE — carry these values forward and return updated versions]\n${stateLines.join(" | ")}`;
      }

      if (rollInfo) {
        const isDndRoll = config.mode === "dnd";
        const rollMax = isDndRoll ? 20 : 6;
        let dangerNote;
        if (isDndRoll) {
          dangerNote = rollInfo.value === 1
            ? " Narrate a catastrophic failure — something goes dramatically wrong."
            : rollInfo.value <= 9
            ? " Narrate a clear failure with complications."
            : rollInfo.value <= 14
            ? " Narrate partial success with a cost or catch."
            : rollInfo.value <= 19
            ? " Narrate solid success."
            : " Narrate a critical success — natural 20, exceptional outcome.";
        } else {
          dangerNote = rollInfo.value === 1
            ? " Narrate a serious consequence. If this was physically dangerous, reduce health in stats."
            : rollInfo.value <= 3
            ? " Narrate a complication or setback."
            : rollInfo.value <= 5
            ? " Narrate partial success with a catch."
            : " Narrate exceptional success, perhaps with an unexpected bonus.";
        }
        const bonusNote = isDndRoll
          ? (rollInfo.statBonus != null && rollInfo.statBonus !== 0 ? ` (ability modifier ${rollInfo.statBonus >= 0 ? "+" : ""}${rollInfo.statBonus} applied)` : "")
          : (rollInfo.skillBonus ? " (skill bonus applied)" : "");
        lastMsg += `\n\n[FATE CHECK: ${rollInfo.context || "the attempt"}]\nRoll: ${rollInfo.value}/${rollMax} — ${rollInfo.outcome}${bonusNote}.\nOutcome: ${rollInfo.narrative || ""}${dangerNote}`;
      }
      history.push({ role: "user", content: lastMsg });
    }

    const result = await callAPI(history);
    if (!result) { setLoading(false); return; } // key modal shown

    // Tolerate the old field name for one release — a response may be in flight
    // from a client that predates the chapterComplete → chapterSolved rename.
    const solved = result.chapterSolved ?? result.chapterComplete ?? false;

    setStoryLog(prev => [...prev, { role: "narrator", text: result.story }]);
    if (result.stats && config.trackStats) setStats(result.stats);
    if (solved) {
      // A solve (even on the final chapter) routes through the closure card below,
      // which owns the gameOver transition — don't end the game here.
      setChoices([]);
      setCurrentMood("triumphant");
    } else if (result.gameOver) {
      // A non-solve ending (e.g. death mid-chapter) ends immediately, as before.
      setGameOver(true);
      setChoices([]);
      setCurrentMood(result.gameOverReason?.toLowerCase().includes("death") ? "sad" : "triumphant");
    } else {
      setChoices(result.choices?.length ? result.choices : [t("continue_")]);
      setCurrentMood(result.mood || "neutral");
    }

    // Health damage on critical failure if LLM didn't handle it
    if (rollInfo?.value === 1 && config.trackStats && !result.stats) {
      setStats(s => ({ ...s, health: Math.max(0, s.health - 15) }));
    }

    // Store next roll requirement
    setNextRollRequired({ required: !!result.rollRequired, context: result.rollContext || "" });

    // Chapter progress (cumulative) + stuck detection. Runs every turn — an
    // absent chapterProgress is itself a no-movement signal, so this must not be
    // gated on `result.chapterProgress` being present. Deltas are computed
    // against the render snapshot rather than inside the updater because we need
    // to know whether the merge actually moved; safe because makeChoice is
    // guarded by `loading` and never runs concurrently with itself.
    const cp        = result.chapterProgress || {};
    const mergedAch = mergeDedup(chapterProgress.achieved, cp.achieved || []);
    const mergedClu = mergeDedup(chapterProgress.clues,    cp.clues    || []);
    // Only a genuinely NEW item counts as movement. A reworded restatement of an
    // existing clue must not reset the counter, or a stuck player would never be
    // offered the costly way out.
    const moved = mergedAch.length > chapterProgress.achieved.length
               || mergedClu.length > chapterProgress.clues.length;
    setChapterProgress({ achieved: mergedAch, clues: mergedClu });
    if (moved) setStuckTurns(0);
    else if (!solved) setStuckTurns(n => n + 1);

    // Merge worldState — npcs by name, locations/facts merged on meaning rather
    // than exact text (the LLM rewords them every turn; see mergeDedup).
    if (result.worldState) {
      const ws = result.worldState;
      setWorldState(prev => ({
        npcs:      mergeNpcs(prev.npcs, ws.npcs),
        locations: mergeDedup(prev.locations, ws.locations || []),
        facts:     mergeDedup(prev.facts,     ws.facts     || []).slice(0, 8),
      }));
    }

    // Chapter solved → rich closure card + a bounded, downstream-only bible nudge,
    // then (unless final) prepare the next chapter in the background while the
    // player reads the closure. The terse solving turn is already in the feed;
    // this wraps it. resolveChapter is awaited under the existing spinner.
    if (solved) {
      const fullLog = [...storyLog, { role: "player", text: choiceText }, { role: "narrator", text: result.story }];
      const summaryCtx = storySummary.narrative || fullLog.filter(e => e.role === "narrator" || e.role === "player").map(e => `${e.role}: ${e.text}`).join("\n").slice(0, 600);
      const whatHappened = `Solved via: ${result.solvedVia || "the player's own approach"}. Recent events: ${summaryCtx}`;
      const isLast = chapterNumber >= totalChapters || result.gameOver;

      const resolved = await resolveChapter(chapterNumber, totalChapters, whatHappened, config, bibleRef.current);
      // Apply the bounded update — clamped so the spine cannot move (see clampBibleUpdate).
      if (resolved?.update && bibleRef.current) {
        const nb = clampBibleUpdate(bibleRef.current, chapterNumber, resolved.update);
        bibleRef.current = nb;
        setStoryBible(nb);
      }
      setStoryLog(prev => [...prev, { role: "closure", text: resolved?.closureText || result.story, num: chapterNumber, solvedVia: result.solvedVia || "" }]);

      if (isLast) {
        setInterlude({ kind: "closure", ready: true, final: true }); // Continue → gameOver
      } else {
        setInterlude({ kind: "closure", ready: false });
        setTimeout(() => triggerSummarize(fullLog, storySummary), 500); // re-ground for the new chapter
        pendingChapterRef.current = null;
        prepareChapter(chapterNumber + 1, summaryCtx, config, character, totalChapters, bibleRef.current).then(prep => {
          pendingChapterRef.current = prep;
          setInterlude(i => (i && i.kind === "closure") ? { ...i, ready: !!prep } : i);
        });
      }
    }

    const newTurnCount = turnCount + 1;
    setTurnCount(newTurnCount);
    setLoading(false);

    // Periodic summarization — every 5 turns; skip on a solve (handled above).
    if (!solved && newTurnCount % SUMMARY_EVERY === 0) {
      const fullNewLog = [...storyLog, { role: "player", text: choiceText }, { role: "narrator", text: result.story }];
      setTimeout(() => triggerSummarize(fullNewLog, storySummary), 3000);
    }
  };

  const handleCustomAction = () => {
    if (customAction.trim()) { handleChoiceClick(customAction.trim()); setCustomAction(""); }
  };

  const resetGame = () => {
    setPhase("home"); setSetupStep(0); setStepSelections({}); setStoryLog([]); setChoices([]);
    setStats({ health: 100, inventory: [], relationships: {} });
    setGameOver(false); setTurnCount(0); setCustomAction("");
    setCharacter({ name: "", gender: "", age: "", appearance: "", skills: [], dndRace: "", dndClass: "", abilityScores: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 } });
    setConfig({ mode: "", genre: "", language: prefs.language || "English", ageTier: "", responseLength: "", chapterCount: 0, deathPossible: null, trackStats: null, perspective: "second", storyPrompt: "" });
    setStorySummary({ narrative: "", world: null });
    setWorldState({ npcs: {}, locations: [], facts: [] });
    setChapterNumber(1); setChapterBrief(null); setChapterBanner(null);
    setPendingRoll(null); setNextRollRequired({ required: false, context: "" });
    setChapterProgress({ achieved: [], clues: [] });
    setHintLevel(0); setStuckTurns(0);
    setBriefStatus("idle"); briefReqRef.current++; // invalidate any brief/chapter still in flight
    setStoryBible(null); bibleRef.current = null;
    setInterlude(null); pendingChapterRef.current = null;
  };

  const handleExport = () => {
    const content = exportStoryAsText({ storyLog, config, character, stats, turnCount, gameOver, chapterNumber });
    triggerDownload(`${character.name}-adventure-${Date.now()}.txt`, content, "text/plain;charset=utf-8");
  };

  const handleSaveGame = () => {
    const payload = buildSavePayload({ config, character, stats, storyLog, choices, turnCount, gameOver, storySummary, worldState, chapterNumber, chapterBrief, chapterProgress, stuckTurns, hintLevel, storyBible });
    triggerDownload(`${character.name}-save-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
  };

  const handleLoadGame = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const save = loadAndValidateSave(ev.target.result);
        setConfig(save.config);
        setCharacter(save.character);
        setStats(save.stats || { health: 100, inventory: [], relationships: {} });
        setStoryLog(save.storyLog);
        setChoices(save.choices || []);
        setTurnCount(save.turnCount || 0);
        setGameOver(save.gameOver || false);
        setStorySummary(save.storySummary || { narrative: "", world: null });
        setWorldState(save.worldState || { npcs: {}, locations: [], facts: [] });
        setChapterNumber(save.chapterNumber || 1);
        setChapterBrief(save.chapterBrief || null);
        setChapterBanner(null);
        setPendingRoll(null);
        setNextRollRequired({ required: false, context: "" });
        setChapterProgress(save.chapterProgress || { achieved: [], clues: [] });
        setHintLevel(save.hintLevel || 0);   // revealed approaches are earned — restore them
        setStuckTurns(save.stuckTurns || 0);
        setStoryBible(save.storyBible || null); bibleRef.current = save.storyBible || null;
        setInterlude(null); pendingChapterRef.current = null; // resume into play, not mid-card
        setBriefStatus("idle");
        briefReqRef.current++;               // invalidate any brief in flight from the abandoned run
        setPhase("game");
      } catch (err) {
        alert(err?.message === "version" ? t("versionError") : t("loadError"));
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ─── SETUP STEPS ──────────────────────────────────────────────
  const renderSetupStep = () => {
    const nav = { theme, isRTL, backLabel: t("back"), nextLabel: t("continue_") };
    const activePrimary = (THEMES[config.genre] || theme).primary || theme.primary;
    const stepStrip = (
      <StepStrip
        step={setupStep}
        selections={stepSelections}
        activePrimary={activePrimary}
        theme={theme}
        t={t}
        isRTL={isRTL}
        onJump={(i) => setSetupStep(i)}
        stepDefs={modeStepDefs}
      />
    );
    const cardProps = { stepStrip, activePrimary };

    // Resolves the step index for a given step key within the current mode's step list.
    const stepIdx = (key) => modeSetupSteps.indexOf(key);

    // Pick a value, record its display label, and auto-advance after a short flash.
    const pickAndAdvance = (idx, label, applyConfig) => {
      if (applyConfig) applyConfig();
      setStepSelections(p => ({ ...p, [idx]: label }));
      if (idx < modeSetupSteps.length - 1) {
        setTimeout(() => setSetupStep(idx + 1), 120);
      }
    };

    // Back link (text style) used on auto-advance steps.
    const BackLink = ({ to, label }) => (
      <div style={{ marginTop: 18 }}>
        <button onClick={to === "home" ? () => setPhase("home") : () => setSetupStep(to)} style={{
          background: "transparent", border: "none", padding: "4px 0",
          color: theme.textMuted, fontFamily: theme.body, fontSize: 12,
          cursor: "pointer", opacity: 0.75,
        }}>{label || t("back")}</button>
      </div>
    );

    switch (currentStep) {
      case "learnlang": {
        const learnOptions = LANGUAGES.filter(L => L.code !== config.language);
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("learnLangRequired")} subtitle={t("learnLangRequiredSub")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {learnOptions.map(L => (
                <OptionButton key={L.code} theme={theme} selected={prefs.translationLanguage === L.code}
                  onClick={() => {
                    setPrefs(p => ({ ...p, translationLanguage: L.code }));
                    pickAndAdvance(stepIdx("learnlang"), L.label, null);
                  }}>
                  {L.label}
                </OptionButton>
              ))}
            </div>
            <BackLink to="home" label={t("homeBack")} />
          </SetupCard>
        );
      }

      case "genre":
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("chooseWorld")} subtitle={t("chooseWorldSub")}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {Object.entries(THEMES).map(([key, th]) => {
                const selected = config.genre === key;
                const motifs = GENRE_ICONS[key] || [];
                return (
                  <OptionButton key={key} theme={theme} selected={selected}
                    onClick={() => pickAndAdvance(0, t(th.nameKey), () => {
                      setConfig(c => ({ ...c, genre: key }));
                      setCharacter(c => ({ ...c, skills: [] }));
                    })}>
                    {selected ? (
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginBottom: 8, color: th.primary }}>
                        {motifs.map((n, i) => (
                          <Icon key={i} name={n} size={i === 0 ? 26 : 18} strokeWidth={1.5} style={{ opacity: i === 0 ? 1 : 0.55 }} />
                        ))}
                      </div>
                    ) : (
                      <div style={{ marginBottom: 8, color: th.primary, display: "flex", justifyContent: "center" }}>
                        <Icon name={motifs[0]} size={28} strokeWidth={1.5} />
                      </div>
                    )}
                    <span style={{
                      fontFamily: th.displayFont, fontWeight: 500, fontSize: 18,
                      fontStyle: th.displayItalic ? "italic" : "normal",
                      letterSpacing: "-0.005em",
                    }}>{t(th.nameKey)}</span>
                  </OptionButton>
                );
              })}
            </div>
            <BackLink to={config.mode === "educational" ? stepIdx("learnlang") : "home"} label={config.mode === "educational" ? undefined : t("homeBack")} />
          </SetupCard>
        );

      case "age":
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("contentRating")} subtitle={t("contentRatingSub")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["kids","kids","kidsSub"],["teen","teen","teenSub"],["adult","adult","adultSub"]].map(([key,lbl,sub]) => (
                <OptionButton key={key} theme={theme} selected={config.ageTier === key}
                  onClick={() => pickAndAdvance(stepIdx("age"), t(lbl), () => setConfig(c => ({ ...c, ageTier: key })))}>
                  <strong style={{ fontFamily: theme.heading }}>{t(lbl)}</strong>
                  <span style={{ display: "block", fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{t(sub)}</span>
                </OptionButton>
              ))}
            </div>
            <BackLink to={config.mode === "dnd" ? "home" : stepIdx("genre")} />
          </SetupCard>
        );

      case "length":
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("storyPacing")} subtitle={t("storyPacingSub")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[["short","short","shortSub"],["medium","medium","mediumSub"],["long","long","longSub"]].map(([key,lbl,sub]) => (
                <OptionButton key={key} theme={theme} selected={config.responseLength === key}
                  onClick={() => pickAndAdvance(stepIdx("length"), t(lbl), () => setConfig(c => ({ ...c, responseLength: key })))}>
                  <strong style={{ fontFamily: theme.heading }}>{t(lbl)}</strong>
                  <span style={{ display: "block", fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{t(sub)}</span>
                </OptionButton>
              ))}
            </div>
            <BackLink to={stepIdx("age")} />
          </SetupCard>
        );

      case "duration":
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("storyDuration")} subtitle={t("storyDurationSub")}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[
                { chapters: 1, icon: "bolt",     labelKey: "sprint",   descKey: "sprintDesc" },
                { chapters: 2, icon: "run",      labelKey: "shortAdv", descKey: "shortAdvDesc" },
                { chapters: 4, icon: "book",     labelKey: "standard", descKey: "standardDesc" },
                { chapters: 8, icon: "mountain", labelKey: "epic",     descKey: "epicDesc" },
              ].map(({ chapters, icon, labelKey, descKey }) => (
                <OptionButton key={chapters} theme={theme} selected={config.chapterCount === chapters}
                  onClick={() => pickAndAdvance(stepIdx("duration"), t(labelKey), () => setConfig(c => ({ ...c, chapterCount: chapters })))}
                  style={{ textAlign: "center", padding: "16px 12px" }}>
                  <div style={{ marginBottom: 8, color: activePrimary, display: "flex", justifyContent: "center" }}>
                    <Icon name={icon} size={24} strokeWidth={1.5} />
                  </div>
                  <strong style={{ fontFamily: theme.heading, fontSize: 15 }}>{t(labelKey)}</strong>
                  <span style={{ display: "block", fontSize: 12, color: theme.textMuted, marginTop: 4 }}>{t(descKey)}</span>
                </OptionButton>
              ))}
            </div>
            <BackLink to={stepIdx("length") >= 0 ? stepIdx("length") : stepIdx("age")} />
          </SetupCard>
        );

      case "rules":
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("gameRules")} subtitle={t("gameRulesSub")}>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontFamily: theme.body, color: theme.text, fontSize: 14, marginBottom: 10 }}>{t("canDie")}</p>
              <div style={{ display: "flex", gap: 10 }}>
                <OptionButton theme={theme} selected={config.deathPossible === true} onClick={() => setConfig(c => ({ ...c, deathPossible: true }))} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ marginBottom: 4, color: activePrimary, display: "flex", justifyContent: "center" }}><Icon name="skull" size={20} /></div>
                  {t("yesDeath")}
                </OptionButton>
                <OptionButton theme={theme} selected={config.deathPossible === false} onClick={() => setConfig(c => ({ ...c, deathPossible: false }))} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ marginBottom: 4, color: activePrimary, display: "flex", justifyContent: "center" }}><Icon name="shield" size={20} /></div>
                  {t("noDeath")}
                </OptionButton>
              </div>
            </div>
            <div>
              <p style={{ fontFamily: theme.body, color: theme.text, fontSize: 14, marginBottom: 10 }}>{t("trackStatsQ")}</p>
              <div style={{ display: "flex", gap: 10 }}>
                <OptionButton theme={theme} selected={config.trackStats === true} onClick={() => setConfig(c => ({ ...c, trackStats: true }))} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ marginBottom: 4, color: activePrimary, display: "flex", justifyContent: "center" }}><Icon name="chart" size={20} /></div>
                  {t("yesStats")}
                </OptionButton>
                <OptionButton theme={theme} selected={config.trackStats === false} onClick={() => setConfig(c => ({ ...c, trackStats: false }))} style={{ flex: 1, textAlign: "center" }}>
                  <div style={{ marginBottom: 4, color: activePrimary, display: "flex", justifyContent: "center" }}><Icon name="book" size={20} /></div>
                  {t("noStats")}
                </OptionButton>
              </div>
            </div>
            <NavButtons {...nav}
              onBack={() => setSetupStep(stepIdx("duration"))}
              onNext={() => { setStepSelections(p => ({ ...p, [stepIdx("rules")]: t("rulesSet") })); setSetupStep(stepIdx("prompt")); }}
              canNext />
          </SetupCard>
        );

      case "prompt":
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("storySeed")} subtitle={t("storySeedSub")}>
            <textarea value={config.storyPrompt} onChange={e => setConfig(c => ({ ...c, storyPrompt: e.target.value }))}
              placeholder={seedFor(lang, config.genre) || t("storySeedPH")}
              style={{ ...inputStyle(theme), minHeight: 120, resize: "vertical", direction: isRTL ? "rtl" : "ltr" }} />
            <NavButtons {...nav}
              onBack={() => setSetupStep(stepIdx("rules") >= 0 ? stepIdx("rules") : stepIdx("duration"))}
              onNext={() => {
                const seedLabel = config.storyPrompt.trim() ? config.storyPrompt.trim().slice(0, 7) : t("seedSurprise");
                setStepSelections(p => ({ ...p, [stepIdx("prompt")]: seedLabel }));
                setSetupStep(stepIdx(config.mode === "dnd" ? "dnd-character" : "character"));
              }}
              canNext />
          </SetupCard>
        );

      case "character": {
        const skillsDisplay = getSkillsDisplay(config.genre);
        const nameChips = namesFor(lang, config.genre);
        const chipBtn = (name, gender) => (
          <button key={name}
            onClick={() => setCharacter(c => ({ ...c, name, gender }))}
            style={{
              background: character.name === name ? theme.primary : "transparent",
              border: `1px solid ${character.name === name ? theme.primary : theme.border}`,
              borderRadius: 14, padding: "3px 11px",
              color: character.name === name ? theme.bg : theme.textMuted,
              fontFamily: theme.body, fontSize: 12, cursor: "pointer", transition: "all 0.15s",
            }}>{name}</button>
        );
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("createChar")} subtitle={t("createCharSub")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 8 }}>
                  <div>
                    <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, display: "block", marginBottom: 4 }}>
                      {t("name")} <span style={{ opacity: 0.5 }}>({t("optional_")})</span>
                    </label>
                    <input value={character.name} onChange={e => setCharacter(c => ({ ...c, name: e.target.value }))}
                      placeholder={t("namePH")} style={{ ...inputStyle(theme), direction: isRTL ? "rtl" : "ltr" }} />
                  </div>
                  <div>
                    <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, display: "block", marginBottom: 4 }}>
                      {t("age")} <span style={{ opacity: 0.5 }}>({t("optional_")})</span>
                    </label>
                    <input value={character.age} onChange={e => setCharacter(c => ({ ...c, age: e.target.value }))}
                      placeholder="6 – 66" style={inputStyle(theme)} />
                  </div>
                </div>
                {/* Name suggestions */}
                <div style={{ marginBottom: 2 }}>
                  <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, display: "block", marginBottom: 5 }}>
                    {t("suggestedNames")}:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 5 }}>
                    <span style={{ color: theme.textMuted, fontSize: 13, alignSelf: "center", minWidth: 14 }}>♂</span>
                    {nameChips.male.map(n => chipBtn(n, "male"))}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    <span style={{ color: theme.textMuted, fontSize: 13, alignSelf: "center", minWidth: 14 }}>♀</span>
                    {nameChips.female.map(n => chipBtn(n, "female"))}
                  </div>
                </div>
              </div>
              <div>
                <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, display: "block", marginBottom: 6 }}>{t("gender")} <span style={{ opacity: 0.5 }}>({t("optional_")})</span></label>
                <div style={{ display: "flex", gap: 8 }}>
                  {["male","female","nonBinary","other"].map(g => (
                    <OptionButton key={g} theme={theme} selected={character.gender === g}
                      onClick={() => setCharacter(c => ({ ...c, gender: g }))}
                      style={{ flex: 1, textAlign: "center", padding: "8px 4px", fontSize: 13 }}>{t(g)}</OptionButton>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, display: "block", marginBottom: 4 }}>
                  {t("appearance")} <span style={{ opacity: 0.5 }}>({t("optional_")})</span>
                </label>
                <textarea value={character.appearance} onChange={e => setCharacter(c => ({ ...c, appearance: e.target.value }))}
                  placeholder={t("appearancePH")} style={{ ...inputStyle(theme), minHeight: 60, resize: "vertical", direction: isRTL ? "rtl" : "ltr" }} />
              </div>
              <div>
                <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, display: "block", marginBottom: 6 }}>
                  {t("skills")} <span style={{ opacity: 0.5 }}>{t("skillsSub")} — {t("optional_")}, 2 will be chosen if skipped</span>
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {skillsDisplay.map(skill => {
                    const sel = character.skills.includes(skill);
                    return (
                      <OptionButton key={skill} theme={theme} selected={sel}
                        onClick={() => setCharacter(c => ({
                          ...c, skills: sel ? c.skills.filter(s => s !== skill) : c.skills.length < 3 ? [...c.skills, skill] : c.skills,
                        }))}
                        style={{ padding: "7px 14px", fontSize: 13 }}>{skill}</OptionButton>
                    );
                  })}
                </div>
              </div>
            </div>
            <NavButtons {...nav} onBack={() => setSetupStep(stepIdx("prompt"))} onNext={startAdventure}
              canNext nextLabel={t("beginAdventure")} />
          </SetupCard>
        );
      }
      case "dnd-character": {
        const roll4d6dl = () => {
          const d = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6)).sort((a, b) => a - b);
          return d.slice(1).reduce((s, v) => s + v, 0);
        };
        const mod = s => Math.floor((s - 10) / 2);
        const modStr = s => { const m = mod(s); return m >= 0 ? `+${m}` : `${m}`; };
        const statKeys = ["statSTR","statDEX","statCON","statINT","statWIS","statCHA"];
        return (
          <SetupCard theme={theme} active isRTL={isRTL} {...cardProps} title={t("stepDndHero")} subtitle={t("modeDndSub")}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Race */}
              <div>
                <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("dndRace")}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {DND_RACES.map(race => (
                    <OptionButton key={race} theme={theme} selected={character.dndRace === race}
                      onClick={() => setCharacter(c => ({ ...c, dndRace: race }))}
                      style={{ padding: "7px 14px", fontSize: 13 }}>{race}</OptionButton>
                  ))}
                </div>
              </div>
              {/* Class */}
              <div>
                <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("dndClass")}</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {DND_CLASSES.map(cls => (
                    <OptionButton key={cls} theme={theme} selected={character.dndClass === cls}
                      onClick={() => setCharacter(c => ({ ...c, dndClass: cls }))}
                      style={{ padding: "7px 14px", fontSize: 13 }}>{cls}</OptionButton>
                  ))}
                </div>
              </div>
              {/* Ability Scores */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                  <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>{t("dndAbilityScores")}</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => {
                      const scores = {};
                      DND_STATS.forEach((s, i) => { scores[s] = DND_STANDARD_ARRAY[i]; });
                      setCharacter(c => ({ ...c, abilityScores: scores }));
                    }} style={{ background: `${activePrimary}22`, border: `1px solid ${activePrimary}`, borderRadius: 8, padding: "5px 12px", color: activePrimary, fontFamily: theme.body, fontSize: 12, cursor: "pointer" }}>{t("dndStandardArray")}</button>
                    <button onClick={() => {
                      const scores = {};
                      DND_STATS.forEach(s => { scores[s] = roll4d6dl(); });
                      setCharacter(c => ({ ...c, abilityScores: scores }));
                    }} style={{ background: `${activePrimary}22`, border: `1px solid ${activePrimary}`, borderRadius: 8, padding: "5px 12px", color: activePrimary, fontFamily: theme.body, fontSize: 12, cursor: "pointer" }}>{t("dndRollStats")}</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {DND_STATS.map((stat, i) => {
                    const val = character.abilityScores?.[stat] ?? 10;
                    return (
                      <div key={stat} style={{ background: theme.bgStory || theme.bg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 8px", textAlign: "center" }}>
                        <div style={{ fontFamily: theme.body, fontSize: 10, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{t(statKeys[i])}</div>
                        <div style={{ fontFamily: theme.heading, fontSize: 24, color: theme.text, lineHeight: 1 }}>{val}</div>
                        <div style={{ fontFamily: theme.body, fontSize: 12, color: activePrimary, marginTop: 4 }}>{modStr(val)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Name (optional) */}
              <div>
                <label style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, display: "block", marginBottom: 4 }}>
                  {t("name")} <span style={{ opacity: 0.5 }}>({t("optional_")})</span>
                </label>
                <input value={character.name} onChange={e => setCharacter(c => ({ ...c, name: e.target.value }))}
                  placeholder={t("namePH")} style={{ ...inputStyle(theme), direction: isRTL ? "rtl" : "ltr" }} />
              </div>
            </div>
            <NavButtons {...nav}
              onBack={() => setSetupStep(stepIdx("prompt"))}
              onNext={startAdventure}
              canNext={!!character.dndRace && !!character.dndClass}
              nextLabel={t("dndContinue")} />
          </SetupCard>
        );
      }

      default: return null;
    }
  };

  // ─── GAME VIEW ────────────────────────────────────────────────
  const renderGame = () => (
    <div style={{
      display: "flex", gap: isMobile ? 12 : 20,
      flexDirection: isMobile ? "column" : "row",
      maxWidth: 900, width: "100%", margin: "0 auto",
      minHeight: "80vh", direction: isRTL ? "rtl" : "ltr",
    }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Story panel */}
        <div style={{
          background: theme.bgCard, backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: "24px 28px", flex: 1, overflowY: "auto", maxHeight: "70vh",
          boxShadow: "0 10px 40px rgba(0,0,0,0.3)", textAlign: isRTL ? "right" : "left",
        }}>
          {/* Header */}
          <div style={{ marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <h1 style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 18, margin: 0 }}>
                  {theme.icon} {character.name}{t("sAdventure")}
                </h1>
                {chapterBrief && (
                  <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {totalChapters > 1 && (
                      <span>{t("chapterLabel")} {chapterNumber} {t("of")} {totalChapters} — <span style={{ color: theme.primary, fontStyle: "italic" }}>{chapterBrief.title}</span></span>
                    )}
                    {totalChapters === 1 && (
                      <span style={{ color: theme.primary, fontStyle: "italic" }}>{chapterBrief.title}</span>
                    )}
                  </div>
                )}
                {/* The situation is ALWAYS visible — it is what the player is solving.
                    Only `approaches` are hidden, revealed one at a time via the bulb. */}
                {chapterBrief && (
                  <div style={{
                    marginTop: 10, padding: "10px 14px",
                    background: `${theme.primary}0E`, border: `1px dashed ${theme.primary}55`,
                    borderRadius: 8, fontFamily: theme.body, fontSize: 12, lineHeight: 1.55,
                    color: theme.text, maxWidth: 560,
                  }}>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: theme.primary, marginBottom: 4 }}>
                      {t("theSituation")}
                    </div>
                    <div style={{ marginBottom: 10 }}>{chapterBrief.situation}</div>
                    <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.5, color: theme.primary, marginBottom: 4 }}>
                      {t("winCondition")}
                    </div>
                    <div>{chapterBrief.winCondition}</div>

                    {chapterProgress.achieved.length > 0 && (
                      <div style={{ fontSize: 11, marginTop: 10, display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {chapterProgress.achieved.map((item, i) => (
                          <span key={i} style={{
                            background: `${theme.secondary || theme.primary}22`, border: `1px solid ${theme.secondary || theme.primary}44`,
                            borderRadius: 4, padding: "1px 7px 1px 5px", color: theme.secondary || theme.primary, fontSize: 10,
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}><Icon name="check" size={10} strokeWidth={2} /> {item}</span>
                        ))}
                      </div>
                    )}

                    {/* Revealed approaches accumulate — never re-hidden, since the
                        player spent a hint to earn each one. */}
                    {chapterBrief.approaches?.slice(0, hintLevel).map((a, i) => (
                      <div key={i} style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${theme.primary}22`, display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <Icon name="bulb" size={11} style={{ marginTop: 2, color: theme.primary, flexShrink: 0 }} />
                        <span><em style={{ color: theme.textMuted }}>{t("anApproach")} {i + 1}</em> — {a}</span>
                      </div>
                    ))}
                    {hintLevel < (chapterBrief.approaches?.length || 0) && (
                      <button
                        onClick={() => setHintLevel(l => l + 1)}
                        style={{
                          marginTop: 8, background: "transparent",
                          border: `1px solid ${theme.primary}55`, borderRadius: 6,
                          padding: "4px 10px", color: theme.primary,
                          fontFamily: theme.body, fontSize: 10, cursor: "pointer",
                          letterSpacing: "0.04em",
                          display: "inline-flex", alignItems: "center", gap: 5,
                        }}
                      >
                        <Icon name="bulb" size={10} /> {hintLevel === 0 ? t("revealHint") : t("revealApproach")}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <button onClick={handleSaveGame} title={t("saveGame")} style={{
                  background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6,
                  padding: "4px 10px", color: theme.textMuted, fontFamily: theme.heading, fontSize: 11,
                  cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor = theme.border;  e.currentTarget.style.color = theme.textMuted; }}>
                  <Icon name="save" size={13} /> {t("saveGame")}
                </button>
                <button onClick={handleExport} title={t("exportStory")} style={{
                  background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6,
                  padding: "4px 10px", color: theme.textMuted, fontFamily: theme.heading, fontSize: 11,
                  cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
                  onMouseOut={e  => { e.currentTarget.style.borderColor = theme.border;  e.currentTarget.style.color = theme.textMuted; }}>
                  <Icon name="export" size={13} /> {t("exportStory")}
                </button>
                <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12 }}>{t("turn")} {turnCount}</span>
              </div>
            </div>
            <GenreIconStrip theme={theme} genre={config.genre} />
          </div>

          {/* First-turn educational-mode hint */}
          {(config.mode === "educational" || (prefs.translationLanguage && prefs.translationLanguage !== "off" && prefs.translationLanguage !== lang)) && !prefs.wordHintDismissed && storyLog.some(e => e.role === "narrator") && (
            <div style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              padding: "10px 14px", margin: "0 0 14px",
              background: `${theme.primary}10`, border: `1px solid ${theme.primary}40`, borderRadius: 10,
            }}>
              <Icon name="speech" size={16} color={theme.primary} />
              <p style={{
                flex: 1, margin: 0, fontFamily: theme.body, fontSize: 12,
                color: theme.text, lineHeight: 1.5,
              }}>
                {t("wordHint")}
              </p>
              <button
                onClick={() => setPrefs(p => ({ ...p, wordHintDismissed: true }))}
                style={{
                  background: "transparent", border: `1px solid ${theme.primary}55`, borderRadius: 999,
                  padding: "3px 10px", color: theme.primary, fontFamily: theme.body, fontSize: 11,
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >{t("wordHintDismiss")}</button>
            </div>
          )}

          {/* Story log */}
          {storyLog.map((entry, i) => {
            if (entry.role === "prologue" || entry.role === "closure") {
              const title = entry.role === "closure"
                ? t("chapterClosureTitle")
                : (entry.kind === "adventure" ? t("advPrologueTitle") : t("chapterPrologueTitle"));
              return (
                <div key={i} style={{
                  margin: "22px 0", padding: "20px 24px",
                  background: `${theme.primary}0C`, border: `1px solid ${theme.primary}33`,
                  borderRadius: 14, textAlign: isRTL ? "right" : "left",
                }}>
                  <div style={{ fontFamily: theme.body, color: theme.primary, fontSize: 11, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10, textAlign: "center" }}>
                    {title}{entry.num ? ` — ${t("chapterLabel")} ${entry.num}` : ""}
                  </div>
                  {String(entry.text).split(/\n+/).filter(Boolean).map((para, pi) => (
                    <p key={pi} style={{ fontFamily: theme.body, color: theme.text, fontSize: 15, lineHeight: 1.7, margin: pi === 0 ? 0 : "12px 0 0" }}>{para}</p>
                  ))}
                  {entry.solvedVia && (
                    <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, marginTop: 12, fontStyle: "italic", textAlign: "center" }}>
                      {t("chapterSolvedMsg")} — {entry.solvedVia}
                    </div>
                  )}
                </div>
              );
            }
            if (entry.role === "chapter") {
              return (
                <div key={i} style={{
                  textAlign: "center", margin: "24px 0 20px", padding: "12px 20px",
                  background: `${theme.primary}10`, border: `1px solid ${theme.primary}30`,
                  borderRadius: 10,
                }}>
                  <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 }}>
                    {t("chapterLabel")} {entry.num || ""}
                  </div>
                  <div style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 16, letterSpacing: 1 }}>
                    {entry.text}
                  </div>
                  {entry.solvedVia && (
                    <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, marginTop: 6, fontStyle: "italic" }}>
                      {t("chapterSolvedMsg")} — {entry.solvedVia}
                    </div>
                  )}
                </div>
              );
            }
            if (entry.role === "roll") {
              const isDndEntry = config.mode === "dnd";
              const oc = getDiceOutcome(entry.value, isDndEntry);
              const rollMax = isDndEntry ? 20 : 6;
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10, margin: "8px 0",
                  padding: "7px 14px", background: `${oc?.color || theme.border}15`,
                  border: `1px solid ${oc?.color || theme.border}35`, borderRadius: 8,
                  animation: "fadeIn 0.3s ease",
                }}>
                  <span style={{ color: oc?.color, lineHeight: 0 }}><Icon name="dice" size={18} /></span>
                  <span style={{ fontFamily: theme.body, fontSize: 12, color: theme.textMuted }}>
                    <span style={{ color: oc?.color, fontWeight: 700 }}>{entry.outcome}</span>
                    {entry.context ? ` — ${entry.context}` : ""}
                    <span style={{ opacity: 0.6, marginLeft: 6 }}>{entry.value}/{rollMax}{entry.skillBonus ? " ★" : ""}</span>
                  </span>
                </div>
              );
            }
            const tr = translations[i];
            const translateEnabled =
              config.mode === "educational" ||
              (prefs.translationLanguage && prefs.translationLanguage !== "off" && prefs.translationLanguage !== lang);
            const targetLang = translateEnabled
              ? (prefs.translationLanguage && prefs.translationLanguage !== "off"
                  ? prefs.translationLanguage
                  : LANGUAGES.find(L => L.code !== lang)?.code)
              : null;
            const targetLangMeta = targetLang ? LANGUAGES.find(L => L.code === targetLang) : null;
            return (
              <div key={i} style={{
                marginBottom: 16, padding: entry.role === "player" ? "8px 14px" : 0,
                background: entry.role === "player" ? theme.bgStory : "transparent", borderRadius: 8,
                borderInlineStart: entry.role === "player" ? `3px solid ${theme.primary}` : "none",
              }}>
                {entry.role === "player" && (
                  <span style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5 }}>{character.name}</span>
                )}
                {(entry.role !== "narrator" || !translateEnabled) && (
                  <p style={{
                    fontFamily: theme.body, color: entry.role === "player" ? theme.primary : theme.text,
                    fontSize: entry.role === "player" ? Math.max(13, storyFontSizePx - 1) : storyFontSizePx,
                    lineHeight: 1.75,
                    margin: entry.role === "player" ? "4px 0 0" : 0,
                    fontStyle: entry.role === "player" ? "italic" : "normal", whiteSpace: "pre-wrap",
                  }}>{entry.text}</p>
                )}
                {entry.role === "narrator" && translateEnabled && (() => {
                  const tokens = splitIntoTokens(entry.text);
                  return (
                    <p
                      onPointerDown={() => startLongPress(i, entry.text, targetLang)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                      onPointerCancel={cancelLongPress}
                      style={{
                        fontFamily: theme.body, color: theme.text,
                        fontSize: storyFontSizePx, lineHeight: 1.75, margin: 0,
                        whiteSpace: "pre-wrap", userSelect: "text",
                      }}>
                      {tokens.map((tok, ti) => {
                        if (tok.type !== "word") return <span key={ti}>{tok.text}</span>;
                        const cached = wordCache[wordCacheKey(targetLang, tok.text.toLowerCase())];
                        return (
                          <span
                            key={ti}
                            role="button"
                            tabIndex={0}
                            onMouseDown={e => e.stopPropagation()}
                            onClick={e => handleWordClick(e, tok.text, buildWordContext(tokens, ti), targetLang)}
                            style={{
                              cursor: "pointer",
                              borderBottom: cached ? `1px solid ${theme.primary}55` : "1px dotted transparent",
                              transition: "border-color 0.15s, background 0.15s",
                              borderRadius: 2,
                            }}
                            onMouseEnter={e => { if (!cached) e.currentTarget.style.borderBottom = `1px dotted ${theme.primary}80`; e.currentTarget.style.background = `${theme.primary}10`; }}
                            onMouseLeave={e => { if (!cached) e.currentTarget.style.borderBottom = "1px dotted transparent"; e.currentTarget.style.background = "transparent"; }}
                          >{tok.text}</span>
                        );
                      })}
                    </p>
                  );
                })()}
                {entry.role === "narrator" && entry.text && (
                  <div style={{ marginTop: 8, position: "relative" }}>
                    {!tr && translateEnabled && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => translatePassage(i, entry.text, targetLang)}
                          style={{
                            background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 999,
                            padding: "3px 10px", color: theme.textMuted, fontFamily: theme.body, fontSize: 10.5,
                            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                            letterSpacing: 0.3, transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; }}
                        >
                          <Icon name="speech" size={11} />
                          <span>{t("translate")}</span>
                          {targetLangMeta && (
                            <img
                              src={flagSrc(targetLangMeta.flag)}
                              srcSet={`${flagSrc(targetLangMeta.flag)} 1x, ${flagSrc2x(targetLangMeta.flag)} 2x`}
                              alt=""
                              width={14} height={10}
                              style={{ borderRadius: 1, boxShadow: "0 0 0 1px rgba(0,0,0,0.2)", objectFit: "cover" }}
                            />
                          )}
                        </button>
                        <button
                          onClick={() => translateAllWords(i, entry.text, targetLang)}
                          disabled={!!glossLoading[i]}
                          style={{
                            background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 999,
                            padding: "3px 10px", color: theme.textMuted, fontFamily: theme.body, fontSize: 10.5,
                            cursor: glossLoading[i] ? "wait" : "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                            letterSpacing: 0.3, transition: "all 0.15s", opacity: glossLoading[i] ? 0.6 : 1,
                          }}
                          onMouseEnter={e => { if (!glossLoading[i]) { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; } }}
                          onMouseLeave={e => { if (!glossLoading[i]) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textMuted; } }}
                        >
                          <Icon name="book" size={11} />
                          <span>{glossLoading[i] ? t("glossing") : t("glossAll")}</span>
                        </button>
                      </span>
                    )}
                    {tr?.loading && (
                      <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, fontStyle: "italic" }}>{t("translating")}</span>
                    )}
                    {tr?.error && (
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontFamily: theme.body, color: theme.accent || theme.primary, fontSize: 11 }}>{t("translationError")}</span>
                        <button
                          onClick={() => setTranslations(prev => { const next = { ...prev }; delete next[i]; return next; })}
                          style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 999, padding: "2px 8px", color: theme.textMuted, fontSize: 10.5, cursor: "pointer" }}
                        >{t("helpClose")}</button>
                      </div>
                    )}
                    {tr?.text && !tr.loading && (
                      <div style={{
                        marginTop: 4, padding: "10px 14px",
                        background: `${theme.primary}0C`, border: `1px dashed ${theme.primary}55`,
                        borderRadius: 8, direction: RTL_LANGS.includes(tr.lang) ? "rtl" : "ltr",
                      }}>
                        <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                          <Icon name="speech" size={10} /> {tr.lang}
                        </div>
                        <p style={{
                          fontFamily: theme.body, color: theme.text,
                          fontSize: storyFontSizePx, lineHeight: 1.75, margin: 0, whiteSpace: "pre-wrap",
                        }}>{tr.text}</p>
                        <button
                          onClick={() => setTranslations(prev => { const next = { ...prev }; delete next[i]; return next; })}
                          style={{
                            marginTop: 8, background: "transparent",
                            border: `1px solid ${theme.border}`, borderRadius: 999,
                            padding: "2px 10px", color: theme.textMuted,
                            fontFamily: theme.body, fontSize: 10.5, cursor: "pointer",
                          }}
                        >{t("hideTranslation")}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {(loading || (briefStatus === "loading" && !interlude)) && (
            <div style={{ textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 28, animation: "pulse 1.5s ease-in-out infinite" }}>{theme.icon}</div>
              <p style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 13, marginTop: 8 }}>
                {briefStatus === "loading" && !loading ? t("preparingChapter") : t("storyUnfolds")}
              </p>
              {retryNotice && (
                <p style={{
                  fontFamily: theme.body,
                  color: retryNotice.kind === "fallback" ? theme.accent : theme.textMuted,
                  fontSize: 12, marginTop: 10, opacity: 0.85,
                }}>
                  {t(retryNotice.kind === "fallback" ? "retryFallback" : "retryHighDemand")}
                </p>
              )}
            </div>
          )}

          {/* The brief blocks play, so a failure must never be a dead end: "continue
              anyway" drops chapterSection from the prompt and plays on unchaptered
              rather than bricking the run. */}
          {briefStatus === "error" && !loading && (
            <div style={{ textAlign: "center", padding: 24, marginTop: 16, background: `${theme.accent}12`, border: `1px solid ${theme.accent}40`, borderRadius: 12 }}>
              <p style={{ fontFamily: theme.body, color: theme.text, fontSize: 13 }}>{t("chapterBriefFailed")}</p>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
                <button
                  onClick={retryPrepare}
                  style={{
                    background: theme.primary, border: "none", borderRadius: 6, padding: "6px 14px",
                    color: "#fff", fontFamily: theme.body, fontSize: 12, cursor: "pointer",
                  }}
                >{t("retryChapterBrief")}</button>
                <button
                  onClick={() => { setBriefStatus("idle"); setInterlude(null); }}
                  style={{
                    background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6, padding: "6px 14px",
                    color: theme.textMuted, fontFamily: theme.body, fontSize: 12, cursor: "pointer",
                  }}
                >{t("continueAnyway")}</button>
              </div>
            </div>
          )}

          {gameOver && (
            <div style={{ textAlign: "center", padding: 30, marginTop: 16, background: `${theme.accent}15`, border: `1px solid ${theme.accent}40`, borderRadius: 12 }}>
              <p style={{ fontFamily: theme.heading, color: theme.accent, fontSize: 20, margin: "0 0 20px" }}>{t("adventureOver")}</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={resetGame} style={{
                  background: theme.primary, border: "none", borderRadius: 8, padding: "10px 24px",
                  color: theme.bg, fontFamily: theme.heading, fontSize: 14, cursor: "pointer", fontWeight: 700,
                }}>{t("newAdventure")}</button>
                <button onClick={handleExport} style={{
                  background: "transparent", border: `1px solid ${theme.primary}`, borderRadius: 8, padding: "10px 24px",
                  color: theme.primary, fontFamily: theme.heading, fontSize: 14, cursor: "pointer", fontWeight: 700,
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}><Icon name="export" size={16} /> {t("exportStory")}</button>
              </div>
            </div>
          )}
          <div ref={storyEndRef} />
        </div>

        {/* Interlude card — a prologue/closure is being read; the choices panel is
            replaced by a single Continue, gated on the next chapter being ready. */}
        {interlude && !loading && !gameOver && briefStatus !== "error" && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button
              onClick={handleContinue}
              disabled={interlude.ready === false}
              style={{
                background: interlude.ready === false ? "transparent" : theme.primary,
                border: interlude.ready === false ? `1px solid ${theme.border}` : "none",
                borderRadius: 10, padding: "12px 32px",
                color: interlude.ready === false ? theme.textMuted : theme.bg,
                fontFamily: theme.heading, fontSize: 15, fontWeight: 700,
                cursor: interlude.ready === false ? "default" : "pointer",
                display: "inline-flex", alignItems: "center", gap: 8,
                opacity: interlude.ready === false ? 0.7 : 1, transition: "all 0.2s",
              }}
            >
              {interlude.ready === false
                ? <><span style={{ animation: "pulse 1.5s ease-in-out infinite" }}>{theme.icon}</span> {t("preparingChapter")}</>
                : <>{interlude.kind === "closure" && interlude.final ? t("theEnd") : t("continueBtn")} <Icon name="chevronRight" size={16} /></>}
            </button>
          </div>
        )}

        {/* Choices panel — always show input when game is active, even if LLM returned no suggestions */}
        {!loading && !gameOver && briefStatus === "idle" && !interlude && (
          <div style={{
            background: theme.bgCard, backdropFilter: "blur(20px)", border: `1px solid ${theme.border}`,
            borderRadius: 16, padding: "18px 24px", marginTop: 12, boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
            textAlign: isRTL ? "right" : "left",
          }}>
            {/* Fate check indicator */}
            {nextRollRequired.required && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                padding: "7px 12px", background: `${theme.primary}12`,
                border: `1px solid ${theme.primary}30`, borderRadius: 8,
              }}>
                <span style={{ color: theme.primary, lineHeight: 0 }}><Icon name="dice" size={16} /></span>
                <span style={{ fontFamily: theme.body, color: theme.primary, fontSize: 12, opacity: 0.9 }}>
                  {t("rollRequired")}
                  {nextRollRequired.context ? ` — "${nextRollRequired.context}"` : ""}
                </span>
              </div>
            )}

            <p style={{ fontFamily: theme.heading, color: theme.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 10px" }}>{t("whatDoYouDo")}</p>
            {/* Primary action — text input */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input value={customAction} onChange={e => setCustomAction(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCustomAction()}
                placeholder={t("typeAction")}
                autoFocus
                style={{ ...inputStyle(theme), flex: 1, margin: 0, fontSize: 14, direction: isRTL ? "rtl" : "ltr" }} />
              <button onClick={handleCustomAction} style={{
                background: customAction.trim() ? theme.primary : theme.border,
                border: "none", borderRadius: 8, padding: "10px 18px", color: theme.bg,
                fontFamily: theme.heading, fontSize: 13, cursor: customAction.trim() ? "pointer" : "default",
                fontWeight: 700, transition: "all 0.2s",
              }}>{t("go")}</button>
            </div>
            {/* Suggestions */}
            {choices.length > 0 && (
              <>
                <p style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, margin: "0 0 8px", opacity: 0.7 }}>{t("orChoose")}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {choices.map((choice, i) => (
                    <OptionButton key={i} theme={theme} onClick={() => handleChoiceClick(choice)}>
                      <span style={{ color: theme.primary, fontWeight: 600, marginInlineEnd: 8, opacity: 0.7 }}>{i + 1}.</span>{choice}
                    </OptionButton>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Minimal sidebar — shown when no stats and no chapter progress yet */}
      {!config.trackStats && !(chapterBrief && (chapterProgress.achieved.length > 0 || chapterProgress.clues.length > 0)) && (
        <div style={{
          width: isMobile ? "100%" : 190, flexShrink: 0, background: theme.bgCard, backdropFilter: "blur(20px)",
          border: `1px solid ${theme.border}`, borderRadius: 16, padding: "18px 14px", alignSelf: "flex-start",
          position: isMobile ? "static" : "sticky", top: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", textAlign: isRTL ? "right" : "left",
        }}>
          <SidebarActions theme={theme} t={t} turnCount={turnCount} isRTL={isRTL}
            onSave={handleSaveGame} onExport={handleExport} onQuit={resetGame}
            onKey={() => { setKeyModalContext("game"); setShowKeyModal(true); setKeyInput(""); setKeyError(""); }}
            musicEnabled={musicEnabled} musicVolume={musicVolume}
            onMusicToggle={() => setMusicEnabled(v => !v)} onVolumeChange={setMusicVolume}
          />
        </div>
      )}

      {/* Chapter progress sidebar — shown when stats are off but chapters are active */}
      {!config.trackStats && chapterBrief && (chapterProgress.achieved.length > 0 || chapterProgress.clues.length > 0) && (
        <div style={{
          width: isMobile ? "100%" : 190, flexShrink: 0, background: theme.bgCard, backdropFilter: "blur(20px)",
          border: `1px solid ${theme.border}`, borderRadius: 16, padding: "18px 14px", alignSelf: "flex-start",
          position: isMobile ? "static" : "sticky", top: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", textAlign: isRTL ? "right" : "left",
          display: "flex", flexDirection: "column",
        }}>
          <h3 style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 12px" }}>
            {t("chapterLabel")} {t("progressLabel")}
          </h3>
          {chapterProgress.achieved.map((a, i) => (
            <div key={i} style={{ fontFamily: theme.body, fontSize: 11, marginBottom: 5, color: theme.secondary || theme.primary, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <Icon name="check" size={11} strokeWidth={2} style={{ marginTop: 2 }} /> <span>{a}</span>
            </div>
          ))}
          {chapterProgress.clues.map((c, i) => (
            <div key={i} style={{ fontFamily: theme.body, fontSize: 10, marginBottom: 4, color: theme.primary, opacity: 0.75, fontStyle: "italic", display: "flex", alignItems: "flex-start", gap: 6 }}>
              <Icon name="bulb" size={10} style={{ marginTop: 2 }} /> <span>{c}</span>
            </div>
          ))}
          <SidebarActions theme={theme} t={t} turnCount={turnCount} isRTL={isRTL}
            onSave={handleSaveGame} onExport={handleExport} onQuit={resetGame}
            onKey={() => { setKeyModalContext("game"); setShowKeyModal(true); setKeyInput(""); setKeyError(""); }}
            musicEnabled={musicEnabled} musicVolume={musicVolume}
            onMusicToggle={() => setMusicEnabled(v => !v)} onVolumeChange={setMusicVolume}
          />
        </div>
      )}

      {/* Stats sidebar */}
      {config.trackStats && (
        <div style={{
          width: isMobile ? "100%" : 200, flexShrink: 0, background: theme.bgCard, backdropFilter: "blur(20px)",
          border: `1px solid ${theme.border}`, borderRadius: 16, padding: "20px 16px", alignSelf: "flex-start",
          position: isMobile ? "static" : "sticky", top: 20, boxShadow: "0 10px 40px rgba(0,0,0,0.2)", textAlign: isRTL ? "right" : "left",
          display: "flex", flexDirection: "column",
        }}>
          <h3 style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>{t("stats")}</h3>
          <div style={{ marginBottom: 16 }}>
            <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, textTransform: "uppercase" }}>{t("health")}</span>
            <div style={{ background: `${theme.border}55`, borderRadius: 6, height: 8, marginTop: 4, overflow: "hidden" }}>
              <div style={{ width: `${stats.health}%`, height: "100%", borderRadius: 6, transition: "width 0.5s ease", background: stats.health > 60 ? theme.secondary : stats.health > 30 ? theme.primary : theme.accent }} />
            </div>
            <span style={{ fontFamily: theme.body, color: theme.text, fontSize: 12 }}>{stats.health}/100</span>
          </div>
          {stats.inventory?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, textTransform: "uppercase" }}>{t("inventory")}</span>
              {stats.inventory.map((item, i) => (
                <div key={i} style={{ fontFamily: theme.body, color: theme.text, fontSize: 12, padding: "4px 0", borderBottom: `1px solid ${theme.border}33` }}>• {item}</div>
              ))}
            </div>
          )}
          {stats.relationships && Object.keys(stats.relationships).length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, textTransform: "uppercase" }}>{t("relationships")}</span>
              {Object.entries(stats.relationships).map(([rName, desc]) => (
                <div key={rName} style={{ fontFamily: theme.body, fontSize: 11, marginTop: 6 }}>
                  <span style={{ color: theme.primary }}>{rName}</span>
                  <span style={{ color: theme.textMuted, display: "block" }}>{String(desc)}</span>
                </div>
              ))}
            </div>
          )}
          {chapterBrief && (chapterProgress.achieved.length > 0 || chapterProgress.clues.length > 0) && (
            <div>
              <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>
                {t("chapterLabel")} {t("progressLabel")}
              </span>
              {chapterProgress.achieved.map((a, i) => (
                <div key={i} style={{ fontFamily: theme.body, fontSize: 11, marginTop: 5, color: theme.secondary || theme.primary, display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <Icon name="check" size={11} strokeWidth={2} style={{ marginTop: 2 }} /> <span>{a}</span>
                </div>
              ))}
              {chapterProgress.clues.map((c, i) => (
                <div key={i} style={{ fontFamily: theme.body, fontSize: 10, marginTop: 4, color: theme.primary, opacity: 0.75, fontStyle: "italic", display: "flex", alignItems: "flex-start", gap: 6 }}>
                  <Icon name="bulb" size={10} style={{ marginTop: 2 }} /> <span>{c}</span>
                </div>
              ))}
            </div>
          )}
          <SidebarActions theme={theme} t={t} turnCount={turnCount} isRTL={isRTL}
            onSave={handleSaveGame} onExport={handleExport} onQuit={resetGame}
            onKey={() => { setKeyModalContext("game"); setShowKeyModal(true); setKeyInput(""); setKeyError(""); }}
            musicEnabled={musicEnabled} musicVolume={musicVolume}
            onMusicToggle={() => setMusicEnabled(v => !v)} onVolumeChange={setMusicVolume}
          />
        </div>
      )}
    </div>
  );

  return (
    <>
      <link href={FONTS_URL} rel="stylesheet" />
      <style>{`
        @keyframes float0 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-30px) rotate(5deg); } }
        @keyframes float1 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(-3deg); } }
        @keyframes float2 { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-40px) rotate(8deg); } }
        @keyframes pulse  { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.1); } }
        @keyframes fadeIn { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes diceRoll { 0%,100% { transform:rotate(0deg) scale(1); } 25% { transform:rotate(-15deg) scale(1.05); } 75% { transform:rotate(15deg) scale(0.95); } }
        @keyframes chapterFade { 0% { opacity:0; transform:translateY(-20px) scale(0.95); } 15%,85% { opacity:1; transform:translateY(0) scale(1); } 100% { opacity:0; transform:translateY(-10px) scale(0.98); } }
        * { box-sizing: border-box; }
        html, body { margin: 0; padding: 0; overflow-x: hidden; -webkit-text-size-adjust: 100%; }
        body { background: ${theme.bg}; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        ::placeholder { color: ${theme.textMuted}; opacity: 0.6; }
        /* Inputs — ensure minimum 16px on mobile to prevent iOS zoom on focus */
        @media (max-width: ${MOBILE_BREAKPOINT}px) {
          input[type="text"], input[type="number"], textarea { font-size: 16px !important; }
          button { min-height: 40px; }
          .os-hero { font-size: clamp(26px, 8vw, 36px) !important; }
        }
        /* Selection */
        ::selection { background: ${theme.primary}40; color: ${theme.text}; }
      `}</style>

      <div
        style={{
          minHeight: "100vh", background: theme.bg, backgroundImage: theme.bgImage,
          padding: isMobile ? "24px 14px" : "40px 20px",
          fontFamily: theme.body, color: theme.text, transition: "background 0.6s ease",
          direction: isRTL ? "rtl" : "ltr",
        }}
        onClick={() => {
          if (!hasInteracted.current) {
            hasInteracted.current = true;
            setMusicEnabled(true);
          }
        }}
      >
        {prefs.themeMode !== "light" && <FloatingParticles theme={theme} />}

        {/* Top-right floating nav: Help + Settings */}
        <div style={{
          position: "fixed",
          top: 14,
          [isRTL ? "left" : "right"]: 14,
          display: "flex", gap: 8, zIndex: 400,
        }}>
          <button
            onClick={() => setShowHelp(true)}
            aria-label={t("help")}
            title={t("help")}
            style={{
              background: theme.bgCard, border: `1px solid ${theme.border}`,
              borderRadius: 10, width: 38, height: 38, padding: 0,
              color: theme.textDim || theme.text, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(10px)", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textDim || theme.text; }}
          ><Icon name="help" size={18} /></button>
          <button
            onClick={() => setShowSettings(true)}
            aria-label={t("settings")}
            title={t("settings")}
            style={{
              background: theme.bgCard, border: `1px solid ${theme.border}`,
              borderRadius: 10, width: 38, height: 38, padding: 0,
              color: theme.textDim || theme.text, cursor: "pointer",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              backdropFilter: "blur(10px)", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textDim || theme.text; }}
          ><Icon name="settings" size={18} /></button>
        </div>

        {/* Chapter banner overlay */}
        {chapterBanner && (
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
            background: theme.bgCard, border: `1px solid ${theme.primary}`,
            borderRadius: 16, padding: "28px 52px", textAlign: "center", zIndex: 500,
            boxShadow: `0 0 60px ${theme.primary}30, 0 20px 60px rgba(0,0,0,0.6)`,
            animation: "chapterFade 5s ease-in-out forwards", pointerEvents: "none",
          }}>
            <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, textTransform: "uppercase", letterSpacing: 3, marginBottom: 10 }}>
              {t("chapterLabel")} {chapterNumber} {t("of")} {totalChapters}
            </div>
            <div style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 26, letterSpacing: 1, textShadow: `0 0 30px ${theme.primary}60` }}>
              {chapterBanner}
            </div>
          </div>
        )}

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ── Home screen — OpenStory AI ── */}
          {phase === "home" && (
            <div className="os-home" style={{ maxWidth: 640, margin: "0 auto", paddingTop: isMobile ? 48 : 24 }}>
              {/* Wordmark */}
              <div style={{ textAlign: "center", marginBottom: 40 }}>
                <div style={{ marginBottom: 28 }}>
                  <Wordmark size={isMobile ? "lg" : "xl"} theme={theme} />
                </div>
                <h1 className="os-hero" style={{
                  fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                  fontWeight: 350, fontVariationSettings: '"opsz" 144, "SOFT" 30',
                  color: theme.text,
                  fontSize: "clamp(26px, 4.6vw, 40px)",
                  lineHeight: 1.18, margin: "0 auto 18px",
                  maxWidth: 560, letterSpacing: "-0.01em",
                }}>
                  {t("homeTitle")}
                </h1>
                <p style={{
                  fontFamily: theme.body, color: theme.textDim || theme.textMuted,
                  fontSize: 15, lineHeight: 1.65, margin: "0 auto",
                  maxWidth: 520,
                }}>
                  {t("homeTagline")}
                </p>
              </div>

              {/* Language + translation target selectors */}
              <div style={{
                display: "flex", justifyContent: "center", alignItems: "flex-start",
                gap: 18, marginBottom: 8, flexWrap: "wrap",
              }}>
                <LangMenu
                  value={config.language}
                  onChange={code => {
                    setConfig(c => ({ ...c, language: code }));
                    setPrefs(p => {
                      const next = { ...p, language: code };
                      if (next.translationLanguage === code) next.translationLanguage = "off";
                      return next;
                    });
                  }}
                  theme={theme}
                  options={LANGUAGES}
                  label={t("languageLabel")}
                  isRTL={isRTL}
                />
                <LangMenu
                  value={prefs.translationLanguage || "off"}
                  onChange={code => setPrefs(p => ({ ...p, translationLanguage: code }))}
                  theme={theme}
                  options={[
                    { code: "off", label: t("translateOff"), flag: null, icon: "speech" },
                    ...LANGUAGES.filter(L => L.code !== config.language),
                  ]}
                  label={t("learnLangLabel")}
                  isRTL={isRTL}
                />
              </div>
              <p style={{
                fontFamily: theme.body, color: theme.textMuted, fontSize: 12,
                lineHeight: 1.5, margin: "0 auto 18px", maxWidth: 480, textAlign: "center",
                opacity: 0.85,
              }}>
                {t("learnLangHint")}
              </p>

              {/* Feature bullets */}
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
                gap: 12, marginBottom: 28,
              }}>
                {[
                  { icon: "masks", key: "homeBullet1" },
                  { icon: "wand",  key: "homeBullet2" },
                  { icon: "dice",  key: "homeBullet3" },
                ].map(b => (
                  <div key={b.key} style={{
                    background: theme.bgCard, border: `1px solid ${theme.border}`,
                    borderRadius: 12, padding: "16px 18px",
                    fontFamily: theme.body, color: theme.textDim || theme.text,
                    fontSize: 12, lineHeight: 1.55,
                    letterSpacing: "0.04em",
                    display: "flex", alignItems: "flex-start", gap: 12,
                  }}>
                    <Icon name={b.icon} size={20} color={theme.primary} strokeWidth={1.5} />
                    <span>{t(b.key)}</span>
                  </div>
                ))}
              </div>

              {/* CTA card */}
              <div style={{
                background: theme.bgCard, backdropFilter: "blur(20px)",
                border: `1px solid ${theme.border}`, borderRadius: 16,
                padding: isMobile ? "20px 20px" : "26px 30px",
                boxShadow: prefs.themeMode === "light" ? "0 4px 24px rgba(0,0,0,0.06)" : "0 10px 40px rgba(0,0,0,0.3)",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <p style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, textAlign: "center", margin: "0 0 2px", letterSpacing: "0.04em" }}>
                  {t("modePickerTitle")}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { mode: "adventure", icon: "masks",  titleKey: "modeAdventure",   subKey: "modeAdventureSub"   },
                    { mode: "dnd",       icon: "skull",  titleKey: "modeDnd",          subKey: "modeDndSub"         },
                    { mode: "educational", icon: "speech", titleKey: "modeEducational", subKey: "modeEducationalSub" },
                  ].map(({ mode, icon, titleKey, subKey }) => (
                    <button key={mode}
                      onClick={() => {
                        setConfig(c => ({ ...c, mode, genre: mode === "dnd" ? "fantasy" : c.genre }));
                        setSetupStep(0);
                        setStepSelections({});
                        setPhase("setup");
                      }}
                      style={{
                        background: theme.bgStory || theme.bgCard, border: `1px solid ${theme.border}`,
                        borderRadius: 12, padding: "14px 18px", cursor: "pointer",
                        textAlign: isRTL ? "right" : "left", transition: "border-color 0.2s",
                        display: "flex", alignItems: "flex-start", gap: 14,
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = theme.primary}
                      onMouseLeave={e => e.currentTarget.style.borderColor = theme.border}
                    >
                      <Icon name={icon} size={22} strokeWidth={1.5}
                        style={{ color: theme.primary, flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <div style={{ fontFamily: theme.heading, color: theme.text, fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{t(titleKey)}</div>
                        <div style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 12, lineHeight: 1.5 }}>{t(subKey)}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 10, flexDirection: isMobile ? "column" : "row" }}>
                  <button
                    onClick={handleLoadGame}
                    style={{
                      flex: 1, padding: "12px 0", borderRadius: 10,
                      border: `1px solid ${theme.border}`, background: "transparent",
                      color: theme.textDim || theme.text, fontFamily: theme.body, fontSize: 13, fontWeight: 500,
                      cursor: "pointer", transition: "all 0.15s",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textDim || theme.text; }}
                  >
                    <Icon name="save" size={16} /> {t("loadSaved")}
                  </button>
                  <button
                    onClick={() => setShowHelp(true)}
                    style={{
                      flex: 1, padding: "12px 0", borderRadius: 10,
                      border: `1px solid ${theme.border}`, background: "transparent",
                      color: theme.textDim || theme.text, fontFamily: theme.body, fontSize: 13, fontWeight: 500,
                      cursor: "pointer", transition: "all 0.15s",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.textDim || theme.text; }}
                  >
                    <Icon name="help" size={16} /> {t("help")}
                  </button>
                </div>
                {/* Key / free-turns footer */}
                <div style={{ paddingTop: 12, marginTop: 4, borderTop: `1px solid ${theme.border}55` }}>
                  {hasUserKey() ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontFamily: theme.body, color: theme.primary, fontSize: 11, display: "inline-flex", alignItems: "center", gap: 8, letterSpacing: "0.04em" }}>
                        <Icon name="key" size={14} /> {t("unlimitedTurns")}
                      </span>
                      <button
                        onClick={() => { clearUserKey(); }}
                        style={{ background: "none", border: "none", color: theme.textMuted, fontFamily: theme.body, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                      >
                        {t("changeKey")}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                      <span style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 11, letterSpacing: "0.04em" }}>
                        {t("freeTurnsInfo", { n: String(FREE_TURN_LIMIT) })}
                      </span>
                      <button
                        onClick={() => { setKeyModalContext("home"); setShowKeyModal(true); setKeyInput(""); setKeyError(""); }}
                        style={{
                          background: "none", border: `1px solid ${theme.primary}80`, borderRadius: 6,
                          color: theme.primary, fontFamily: theme.body, fontSize: 11,
                          cursor: "pointer", padding: "5px 12px",
                          display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.04em",
                        }}
                      >
                        <Icon name="key" size={13} /> {t("addYourKey")}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Pitch explainer — sits below the CTAs, falls below the fold on mobile */}
              <p style={{
                fontFamily: theme.body, color: theme.textMuted,
                fontSize: 13, lineHeight: 1.7, margin: "28px auto 0",
                maxWidth: 560, textAlign: isRTL ? "right" : "center",
                opacity: 0.85, direction: isRTL ? "rtl" : "ltr",
              }}>
                {t("pitchExplainer")}
              </p>
            </div>
          )}

          {/* ── Setup wizard ── */}
          {phase === "setup" && (
            <div style={{ maxWidth: 600, margin: "0 auto" }}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <div style={{ marginBottom: 14 }}>
                  <Wordmark size="md" theme={theme} />
                </div>
                <h1 style={{
                  fontFamily: "'Fraunces', 'Cormorant Garamond', serif",
                  fontWeight: 350, fontVariationSettings: '"opsz" 144, "SOFT" 20',
                  color: theme.text,
                  fontSize: "clamp(22px, 4vw, 30px)", margin: "0 0 10px",
                  letterSpacing: "-0.01em",
                }}>
                  {t("adventureAwaits")}
                </h1>
                {config.genre && <GenreIconStrip theme={theme} genre={config.genre} />}
              </div>
              {renderSetupStep()}
            </div>
          )}

          {phase === "game" && renderGame()}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: "center", padding: "24px 0 8px",
          fontFamily: theme.body, fontSize: 11, color: theme.textMuted, opacity: 0.6,
        }}>
          Created by{" "}
          <a
            href="https://github.com/royruho/choose_your_adventure"
            target="_blank" rel="noopener noreferrer"
            style={{ color: theme.primary, textDecoration: "none", opacity: 0.8 }}
            onMouseOver={e => e.currentTarget.style.opacity = "1"}
            onMouseOut={e  => e.currentTarget.style.opacity = "0.8"}
          >
            Roy Ruach
          </a>
        </div>
      </div>

      {/* Key modal — shown when free turns are exhausted */}
      {showKeyModal && (
        <div
          onClick={() => setShowKeyModal(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 900,
            backdropFilter: "blur(8px)", direction: isRTL ? "rtl" : "ltr",
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{
            position: "relative",
            background: theme.bgCard, border: `1px solid ${theme.primary}`,
            borderRadius: 20, padding: "36px 40px", maxWidth: 480, width: "90%",
            boxShadow: `0 0 60px ${theme.primary}20, 0 24px 80px rgba(0,0,0,0.6)`,
          }}>
            <button
              onClick={() => setShowKeyModal(false)}
              aria-label={t("helpClose")}
              title={t("helpClose")}
              style={{
                position: "absolute", top: 10, [isRTL ? "left" : "right"]: 10,
                background: "transparent", border: "none", color: theme.textMuted,
                cursor: "pointer", padding: 6, lineHeight: 0, borderRadius: 6,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = theme.primary; }}
              onMouseLeave={e => { e.currentTarget.style.color = theme.textMuted; }}
            ><Icon name="close" size={18} /></button>
            <h2 style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 22, margin: "0 0 10px", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Icon name="key" size={20} /> {t("keyModalTitle")}
            </h2>
            <p style={{ fontFamily: theme.body, color: theme.textMuted, fontSize: 13, lineHeight: 1.7, marginTop: 0 }}>
              {t(keyModalContext === "home" ? "keyModalSubHome" : "keyModalSub")}
            </p>
            <div style={{ background: `${theme.border}30`, borderRadius: 10, padding: "14px 18px", marginBottom: 18 }}>
              <p style={{ fontFamily: theme.heading, color: theme.primary, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 8px" }}>
                {t("keyHowTo")}
              </p>
              {[
                { text: t("keyStep1"), link: "https://openrouter.ai" },
                { text: t("keyStep2") },
                { text: t("keyStep3") },
                { text: t("keyStep4") },
              ].map(({ text, link }, i) => (
                <div key={i} style={{ fontFamily: theme.body, color: theme.text, fontSize: 12, marginBottom: 5, display: "flex", gap: 8 }}>
                  <span style={{ color: theme.primary, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <span>{link ? <><a href={link} target="_blank" rel="noopener noreferrer" style={{ color: theme.primary }}>openrouter.ai</a> — {text.replace(/^go to openrouter\.ai /i, "")}</> : text}</span>
                </div>
              ))}
            </div>
            <input
              type="text"
              value={keyInput}
              onChange={e => { setKeyInput(e.target.value); setKeyError(""); }}
              onKeyDown={e => e.key === "Enter" && !keyValidating && handleValidateKey()}
              placeholder={t("keyPlaceholder")}
              style={{ ...inputStyle(theme), width: "100%", marginBottom: 10 }}
              autoFocus
            />
            {keyError && (
              <div style={{ fontFamily: theme.body, color: theme.accent, fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="warning" size={14} /> {t("keyError")}: {keyError}
              </div>
            )}
            <button
              onClick={handleValidateKey}
              disabled={keyValidating || !keyInput.trim()}
              style={{
                width: "100%", padding: "12px 0", borderRadius: 8, border: "none",
                background: keyInput.trim() && !keyValidating ? theme.primary : `${theme.border}55`,
                color: keyInput.trim() && !keyValidating ? theme.bg : theme.textMuted,
                fontFamily: theme.heading, fontSize: 15, fontWeight: 700,
                cursor: keyInput.trim() && !keyValidating ? "pointer" : "not-allowed",
                letterSpacing: 1, textTransform: "uppercase", transition: "all 0.2s",
              }}
            >
              {keyValidating ? t("keyValidating") : t("keyValidate")}
            </button>
            <button
              onClick={() => setShowKeyModal(false)}
              style={{
                marginTop: 10, width: "100%", padding: "10px 0", borderRadius: 8,
                background: "transparent", border: `1px solid ${theme.border}`,
                color: theme.textMuted, fontFamily: theme.body, fontSize: 13,
                cursor: "pointer", letterSpacing: 0.3,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = theme.primary; e.currentTarget.style.borderColor = theme.primary; }}
              onMouseLeave={e => { e.currentTarget.style.color = theme.textMuted; e.currentTarget.style.borderColor = theme.border; }}
            >{t("helpClose")}</button>
          </div>
        </div>
      )}

      {/* Dice roller overlay — renders above everything */}
      {pendingRoll && (
        <DiceRoller
          theme={theme}
          context={pendingRoll.context}
          characterSkills={character.skills}
          onResult={handleRollResult}
          isRTL={isRTL}
          t={t}
          mode={config.mode}
          abilityScores={character.abilityScores}
        />
      )}

      {/* Help modal */}
      {showHelp && <HelpModal theme={theme} t={t} isRTL={isRTL} onClose={() => setShowHelp(false)} />}

      {/* Per-word translation popover (educational mode) */}
      <WordPopover popover={wordPopover} onClose={() => setWordPopover(null)} theme={theme} t={t} isRTL={isRTL} />

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          theme={theme} t={t} isRTL={isRTL}
          prefs={prefs} setPrefs={setPrefs}
          musicEnabled={musicEnabled} setMusicEnabled={setMusicEnabled}
          musicVolume={musicVolume} setMusicVolume={setMusicVolume}
          onClose={() => setShowSettings(false)}
        />
      )}

      <input ref={fileInputRef} type="file" accept=".json" style={{ display: "none" }} onChange={handleFileChange} />
    </>
  );
}

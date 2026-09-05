// Devanagari (Hindi) -> Roman (English) transliteration for Indian names.
// Common names / surnames come from a dictionary (spelling people actually
// use); everything else goes through a rule-based engine with schwa
// deletion, so "कमला" -> "Kamla", "राकेश" -> "Rakesh".

const DICT = {
  // surnames / castes common in Jodhpur ward lists
  'भाटी': 'Bhati', 'परिहार': 'Parihar', 'गहलोत': 'Gehlot', 'सोलंकी': 'Solanki',
  'राठौड़': 'Rathore', 'राठौर': 'Rathore', 'राठौड': 'Rathore', 'जांगिड़': 'Jangid', 'जांगिड': 'Jangid',
  'बोराणा': 'Borana', 'गौड़': 'Gaur', 'गौड': 'Gaur', 'अरोड़ा': 'Arora', 'अरोडा': 'Arora',
  'शर्मा': 'Sharma', 'व्यास': 'Vyas', 'पुरोहित': 'Purohit', 'राठी': 'Rathi', 'सोनी': 'Soni',
  'माली': 'Mali', 'सैनी': 'Saini', 'चौधरी': 'Choudhary', 'प्रजापत': 'Prajapat', 'प्रजापति': 'Prajapati',
  'विश्नोई': 'Vishnoi', 'बिश्नोई': 'Bishnoi', 'मीणा': 'Meena', 'मेहरा': 'Mehra', 'पंवार': 'Panwar',
  'चारण': 'Charan', 'श्रीमाली': 'Srimali', 'बोहरा': 'Bohra', 'जैन': 'Jain', 'अग्रवाल': 'Agarwal',
  'गुप्ता': 'Gupta', 'गुप्त': 'Gupta', 'वर्मा': 'Verma', 'ताक': 'Tak', 'दवे': 'Dave', 'जोशी': 'Joshi',
  'खत्री': 'Khatri', 'सांखला': 'Sankhla', 'लोहिया': 'Lohiya', 'तंवर': 'Tanwar', 'भंडारी': 'Bhandari',
  'सिंधी': 'Sindhi', 'सोमपुरा': 'Sompura', 'सुथार': 'Suthar', 'कुम्हार': 'Kumhar', 'नाई': 'Nai',
  'शेखावत': 'Shekhawat', 'रतनू': 'Ratnu', 'रतनु': 'Ratnu', 'चौहान': 'Chauhan', 'मेहता': 'Mehta',
  'माथुर': 'Mathur', 'देवड़ा': 'Devda', 'सिसोदिया': 'Sisodia', 'कच्छवाहा': 'Kachhwaha',
  'भार्गव': 'Bhargav', 'त्रिवेदी': 'Trivedi', 'दाधीच': 'Dadhich', 'पालीवाल': 'Paliwal',
  // muslim names
  'खान': 'Khan', 'खाँ': 'Khan', 'मोहम्मद': 'Mohammad', 'मुहम्मद': 'Muhammad', 'अहमद': 'Ahmed',
  'हुसैन': 'Hussain', 'अली': 'Ali', 'अंसारी': 'Ansari', 'कुरैशी': 'Qureshi', 'शेख': 'Sheikh',
  'बानो': 'Bano', 'बानू': 'Banu', 'बेगम': 'Begum', 'फातिमा': 'Fatima', 'अब्दुल': 'Abdul', 'रहमान': 'Rahman',
  // common male names
  'कुमार': 'Kumar', 'सिंह': 'Singh', 'सिह': 'Singh', 'सिंग': 'Singh', 'लाल': 'Lal', 'राम': 'Ram', 'श्याम': 'Shyam',
  'मोहन': 'Mohan', 'सोहन': 'Sohan', 'गोपाल': 'Gopal', 'कृष्ण': 'Krishna', 'कृष्णा': 'Krishna', 'किशन': 'Kishan',
  'किशोर': 'Kishore', 'गणेश': 'Ganesh', 'महेश': 'Mahesh', 'दिनेश': 'Dinesh', 'रमेश': 'Ramesh',
  'सुरेश': 'Suresh', 'नरेश': 'Naresh', 'राकेश': 'Rakesh', 'मुकेश': 'Mukesh', 'राजेश': 'Rajesh',
  'उमेश': 'Umesh', 'योगेश': 'Yogesh', 'कमलेश': 'Kamlesh', 'प्रकाश': 'Prakash',
  'चन्द्र': 'Chandra', 'चंद्र': 'Chandra', 'चंद': 'Chand', 'चन्द': 'Chand', 'चन्द्रप्रकाश': 'Chandraprakash',
  'देवेन्द्र': 'Devendra', 'देवेंद्र': 'Devendra', 'राजेन्द्र': 'Rajendra', 'राजेंद्र': 'Rajendra',
  'महेन्द्र': 'Mahendra', 'महेंद्र': 'Mahendra', 'नरेन्द्र': 'Narendra', 'नरेंद्र': 'Narendra',
  'सुरेन्द्र': 'Surendra', 'सुरेंद्र': 'Surendra', 'जितेन्द्र': 'Jitendra', 'जितेंद्र': 'Jitendra',
  'रविन्द्र': 'Ravindra', 'रवींद्र': 'Ravindra', 'भंवर': 'Bhanwar', 'भँवर': 'Bhanwar', 'भगवान': 'Bhagwan',
  'नारायण': 'Narayan', 'सत्यनारायण': 'Satyanarayan', 'ओम': 'Om', 'शिव': 'Shiv', 'हरि': 'Hari', 'प्रेम': 'Prem',
  'प्रेमचंद': 'Premchand', 'नेमीचंद': 'Nemichand', 'चम्पालाल': 'Champalal', 'चम्पा': 'Champa',
  'मदन': 'Madan', 'मोहनलाल': 'Mohanlal', 'विजय': 'Vijay', 'अजय': 'Ajay', 'संजय': 'Sanjay',
  'दीपक': 'Deepak', 'पंकज': 'Pankaj', 'मनोज': 'Manoj', 'अनिल': 'Anil', 'सुनील': 'Sunil',
  'कपिल': 'Kapil', 'राजू': 'Raju', 'राज': 'Raj', 'सूरज': 'Suraj', 'पुखराज': 'Pukhraj',
  'बंवारी': 'Banwari', 'बनवारी': 'Banwari', 'कन्हैया': 'Kanhaiya', 'कैलाश': 'Kailash', 'भवानी': 'Bhawani',
  'कार्तिक': 'Kartik', 'प्रतीक': 'Pratik', 'नितिन': 'Nitin', 'सचिन': 'Sachin', 'राहुल': 'Rahul',
  'रोहित': 'Rohit', 'मोहित': 'Mohit', 'अमित': 'Amit', 'सुमित': 'Sumit', 'अंकित': 'Ankit',
  'विकास': 'Vikas', 'विक्रम': 'Vikram', 'अर्जुन': 'Arjun', 'करण': 'Karan', 'यश': 'Yash',
  'हर्ष': 'Harsh', 'देव': 'Dev', 'जगदीश': 'Jagdish', 'गिरधारी': 'Girdhari', 'दान': 'Dan',
  'अश्विनी': 'Ashwini', 'अश्विन': 'Ashwin', 'महावीर': 'Mahavir', 'ईश्वर': 'Ishwar', 'विश्वनाथ': 'Vishwanath',
  'सुमेर': 'Sumer', 'सवाई': 'Sawai', 'गजेन्द्र': 'Gajendra', 'गजेंद्र': 'Gajendra', 'भूपेन्द्र': 'Bhupendra',
  'उम्मेद': 'Ummed', 'अरविन्द': 'Arvind', 'अरविंद': 'Arvind', 'प्रदीप': 'Pradeep', 'संदीप': 'Sandeep',
  'कुलदीप': 'Kuldeep', 'जयदीप': 'Jaideep', 'नीरज': 'Neeraj', 'धीरज': 'Dheeraj', 'अभिषेक': 'Abhishek',
  'अभिजीत': 'Abhijeet', 'अभिजित': 'Abhijit', 'बजरंग': 'Bajrang', 'रणधीर': 'Randhir', 'सुलतान': 'Sultan',
  'गोविन्द': 'Govind', 'गोविंद': 'Govind', 'मांगीलाल': 'Mangilal', 'भीखाराम': 'Bhikharam', 'सागर': 'Sagar',
  'तारा': 'Tara', 'मूल': 'Mool', 'मोहकम': 'Mohkam', 'ताराचंद': 'Tarachand', 'रामचन्द्र': 'Ramchandra',
  'रामेश्वर': 'Rameshwar', 'जसवंत': 'Jaswant', 'दुर्गेश': 'Durgesh', 'हेमलता': 'Hemlata',
  // common female names
  'देवी': 'Devi', 'कुमारी': 'Kumari', 'कंवर': 'Kanwar', 'कँवर': 'Kanwar', 'बाई': 'Bai', 'राधा': 'Radha',
  'सीता': 'Sita', 'गीता': 'Geeta', 'अनीता': 'Anita', 'सुनीता': 'Sunita', 'सविता': 'Savita',
  'कविता': 'Kavita', 'ममता': 'Mamta', 'पुष्पा': 'Pushpa', 'उषा': 'Usha', 'आशा': 'Asha',
  'रेखा': 'Rekha', 'सुमन': 'Suman', 'संतोष': 'Santosh', 'मंजू': 'Manju', 'संजू': 'Sanju',
  'विमला': 'Vimla', 'कमला': 'Kamla', 'शांति': 'Shanti', 'शान्ति': 'Shanti', 'बसंती': 'Basanti',
  'पार्वती': 'Parvati', 'लक्ष्मी': 'Laxmi', 'सरस्वती': 'Saraswati', 'दुर्गा': 'Durga', 'भगवती': 'Bhagwati',
  'लीला': 'Leela', 'मीरा': 'Meera', 'मीना': 'Meena', 'सरिता': 'Sarita', 'बबीता': 'Babita', 'अंजू': 'Anju',
  'पूजा': 'Pooja', 'प्रिया': 'Priya', 'प्रियंका': 'Priyanka', 'नेहा': 'Neha', 'निशा': 'Nisha',
  'मोनिका': 'Monika', 'सोनिका': 'Sonika', 'खुशबू': 'Khushbu', 'अंजलि': 'Anjali', 'अंजली': 'Anjali',
  'दीक्षा': 'Diksha', 'दामिनी': 'Damini', 'नीतू': 'Neetu', 'सीमा': 'Seema', 'रीमा': 'Reema',
  'रेनू': 'Renu', 'मीनाक्षी': 'Meenakshi', 'कोमल': 'Komal', 'पायल': 'Payal', 'सपना': 'Sapna',
  'वर्षा': 'Varsha', 'ज्योति': 'Jyoti', 'दीपिका': 'Deepika', 'किरण': 'Kiran', 'रिया': 'Riya',
  'निकिता': 'Nikita', 'प्रार्थना': 'Prarthana', 'सुप्यार': 'Supyar', 'मुमल': 'Mumal', 'रुक्मणी': 'Rukmani',
  'सुशीला': 'Sushila', 'शकुंतला': 'Shakuntala', 'शकुन्तला': 'Shakuntala', 'कांता': 'Kanta', 'पिस्ता': 'Pista'
};

// Suffixes joined without a space (महावीरसिंह, प्रेमकंवर, सावलदान, मोहनलाल)
const SUFFIXES = ['नारायण', 'चन्द्र', 'चंद्र', 'प्रकाश', 'कुमारी', 'कुमार', 'सिंह', 'सिह', 'कंवर', 'कँवर',
  'लाल', 'राम', 'दान', 'देवी', 'चंद', 'चन्द', 'नाथ', 'दास', 'बाई', 'मल'];
const SUFFIX_EN = { 'नाथ': 'nath', 'दास': 'das', 'मल': 'mal' };

const CONS = {
  'क': 'k', 'ख': 'kh', 'ग': 'g', 'घ': 'gh', 'ङ': 'n', 'च': 'ch', 'छ': 'chh', 'ज': 'j', 'झ': 'jh', 'ञ': 'n',
  'ट': 't', 'ठ': 'th', 'ड': 'd', 'ढ': 'dh', 'ण': 'n', 'त': 't', 'थ': 'th', 'द': 'd', 'ध': 'dh', 'न': 'n',
  'प': 'p', 'फ': 'ph', 'ब': 'b', 'भ': 'bh', 'म': 'm', 'य': 'y', 'र': 'r', 'ल': 'l', 'व': 'v',
  'श': 'sh', 'ष': 'sh', 'स': 's', 'ह': 'h',
  'क़': 'q', 'ख़': 'kh', 'ग़': 'g', 'ज़': 'z', 'ड़': 'r', 'ढ़': 'rh', 'फ़': 'f', 'य़': 'y', 'ळ': 'l'
};
// nukta forms written as base consonant + combining nukta
const NUKTA = { 'क': 'q', 'ख': 'kh', 'ग': 'g', 'ज': 'z', 'ड': 'r', 'ढ': 'rh', 'फ': 'f', 'य': 'y' };

const VOWELS = { 'अ': 'a', 'आ': 'a', 'इ': 'i', 'ई': 'i', 'उ': 'u', 'ऊ': 'u', 'ऋ': 'ri', 'ए': 'e', 'ऐ': 'ai',
  'ओ': 'o', 'औ': 'au', 'ऑ': 'o', 'ऍ': 'e' };
const MATRAS = { 'ा': 'a', 'ि': 'i', 'ी': 'i', 'ु': 'u', 'ू': 'u', 'ृ': 'ri', 'े': 'e', 'ै': 'ai', 'ो': 'o',
  'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e' };
const VIRAMA = '्';
const NUKTA_CH = '़';

// Tokenize a Devanagari word into { c, v } units.
// v = explicit vowel, 'ə' = inherent (undecided) schwa, '' = none (virama)
function tokenize(word) {
  const toks = [];
  const chars = Array.from(word);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (CONS[ch]) {
      let c = CONS[ch];
      if (chars[i + 1] === NUKTA_CH) { c = NUKTA[ch] || c; i++; }
      const t = { c, v: 'ə', afterCluster: toks.length > 0 && toks[toks.length - 1].c !== '' && toks[toks.length - 1].v === '' && !toks[toks.length - 1].nasal };
      const nx = chars[i + 1];
      if (nx === VIRAMA) { t.v = ''; i++; }
      else if (MATRAS[nx] !== undefined) { t.v = MATRAS[nx]; i++; }
      toks.push(t);
    } else if (VOWELS[ch]) {
      toks.push({ c: '', v: VOWELS[ch] });
    } else if (ch === 'ं' || ch === 'ँ') {
      // anusvara / chandrabindu: 'm' before labials, else 'n'
      const nx = chars[i + 1];
      const nasal = nx && /[पफबभम]/.test(nx) ? 'm' : 'n';
      toks.push({ c: nasal, v: '', nasal: true });
    } else if (ch === 'ः') {
      toks.push({ c: 'h', v: '' });
    } else if (MATRAS[ch] !== undefined) {
      // stray matra with no consonant (data noise) - emit vowel only
      toks.push({ c: '', v: MATRAS[ch] });
    } else if (ch === VIRAMA || ch === NUKTA_CH || ch === '॒' || ch === '॑') {
      // skip
    } else {
      toks.push({ c: ch, v: '', raw: true });
    }
  }
  return toks;
}

function hasVowel(t) {
  if (!t) return false;
  if (t.v === 'ə') return !!t.keep;
  return t.v !== '';
}

function ruleWord(word) {
  const toks = tokenize(word);
  const n = toks.length;
  // Decide inherent schwas left-to-right
  for (let i = 0; i < n; i++) {
    const t = toks[i];
    if (t.v !== 'ə') continue;
    const isLast = toks.slice(i + 1).every((x) => x.nasal || x.raw);
    if (isLast) {
      // final schwa dropped, except after a cluster ending in r/y/l/v (Chandra, Satya)
      t.keep = t.afterCluster && /^[rylv]$/.test(t.c);
      continue;
    }
    if (i === 0) { t.keep = true; continue; }
    const prev = toks[i - 1];
    const next = toks[i + 1];
    // medial schwa deleted only when preceded by a vowel sound and the
    // next consonant carries an explicit vowel (matra)
    const nextHasFullVowel = !!(next && next.c && next.v !== '' && next.v !== 'ə');
    const prevHasVowel = hasVowel(prev) || (prev.nasal && hasVowel(toks[i - 2]));
    t.keep = !(prevHasVowel && nextHasFullVowel && !t.afterCluster);
  }
  let out = '';
  for (const t of toks) {
    out += t.c;
    if (t.v === 'ə') out += t.keep ? 'a' : '';
    else out += t.v;
  }
  return out;
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function wordToEnglish(word) {
  if (DICT[word]) return DICT[word];
  const m = word.match(/^(.*?)([^ऀ-ॿ]*)$/);
  const core = m ? m[1] : word;
  const tail = m ? m[2] : '';
  if (DICT[core]) return DICT[core] + tail;
  // compound: prefix + known suffix (महावीरसिंह -> Mahavirsingh)
  for (const suf of SUFFIXES) {
    if (core.length > suf.length && core.endsWith(suf)) {
      const pre = core.slice(0, -suf.length);
      const preEn = DICT[pre] || cap(ruleWord(pre));
      const sufEn = (DICT[suf] || cap(SUFFIX_EN[suf] || ruleWord(suf))).toLowerCase();
      return preEn + sufEn + tail;
    }
  }
  return cap(ruleWord(core)) + tail;
}

const cache = new Map();

export const isDevanagari = (s) => /[ऀ-ॿ]/.test(String(s || ''));

// "राजेश कुमार" -> "Rajesh Kumar"
export function toEnglish(name) {
  if (!name) return '';
  const hit = cache.get(name);
  if (hit) return hit;
  const out = String(name)
    .trim()
    .split(/\s+/)
    .map((w) => (isDevanagari(w) ? wordToEnglish(w) : w))
    .join(' ');
  cache.set(name, out);
  return out;
}

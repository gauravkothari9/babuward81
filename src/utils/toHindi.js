// Approximate Roman -> Devanagari transliteration for Indian names.
// Common names/surnames come from the dictionary (exact); anything else
// goes through a rule-based engine, so output is readable Hindi even
// when the spelling is unusual.

const DICT = {
  // surnames / castes common in Jodhpur ward lists
  bhati: 'भाटी', parihar: 'परिहार', gehlot: 'गहलोत', gahlot: 'गहलोत', gahlate: 'गहलोत',
  solanki: 'सोलंकी', rathore: 'राठौड़', rathod: 'राठौड़', jangid: 'जांगिड़', borana: 'बोराणा',
  gaur: 'गौड़', aroda: 'अरोड़ा', arora: 'अरोड़ा', sharma: 'शर्मा', vyas: 'व्यास',
  purohit: 'पुरोहित', rathi: 'राठी', soni: 'सोनी', mali: 'माली', saini: 'सैनी',
  choudhary: 'चौधरी', chaudhary: 'चौधरी', prajapat: 'प्रजापत', prajapati: 'प्रजापति',
  vishnoi: 'विश्नोई', bishnoi: 'बिश्नोई', meena: 'मीणा', mehra: 'मेहरा', panwar: 'पंवार',
  charan: 'चारण', srimali: 'श्रीमाली', bohra: 'बोहरा', jain: 'जैन', agarwal: 'अग्रवाल',
  gupta: 'गुप्ता', verma: 'वर्मा', tak: 'ताक', dave: 'दवे', joshi: 'जोशी',
  khatri: 'खत्री', sankhla: 'सांखला', lohiya: 'लोहिया', tanwar: 'तंवर', bhandari: 'भंडारी',
  sindhi: 'सिंधी', sompura: 'सोमपुरा', suthar: 'सुथार', kumhar: 'कुम्हार', nai: 'नाई',
  // muslim names
  khan: 'खान', mohammad: 'मोहम्मद', mohammed: 'मोहम्मद', muhammad: 'मुहम्मद',
  ahmed: 'अहमद', ahmad: 'अहमद', hussain: 'हुसैन', husain: 'हुसैन', ali: 'अली',
  ansari: 'अंसारी', qureshi: 'कुरैशी', sheikh: 'शेख', shaikh: 'शेख', bano: 'बानो',
  banu: 'बानू', begum: 'बेगम', fatima: 'फातिमा', abdul: 'अब्दुल', rahman: 'रहमान',
  // common male names
  kumar: 'कुमार', singh: 'सिंह', lal: 'लाल', ram: 'राम', shyam: 'श्याम',
  mohan: 'मोहन', sohan: 'सोहन', gopal: 'गोपाल', krishna: 'कृष्ण', kishan: 'किशन',
  kishor: 'किशोर', kishore: 'किशोर', ganesh: 'गणेश', mahesh: 'महेश', dinesh: 'दिनेश',
  ramesh: 'रमेश', suresh: 'सुरेश', naresh: 'नरेश', rakesh: 'राकेश', mukesh: 'मुकेश',
  rajesh: 'राजेश', umesh: 'उमेश', yogesh: 'योगेश', kamlesh: 'कमलेश', prakash: 'प्रकाश',
  chandra: 'चन्द्र', chand: 'चंद', chandraprakash: 'चन्द्रप्रकाश',
  devendra: 'देवेन्द्र', rajendra: 'राजेन्द्र', rajendrakumar: 'राजेन्द्रकुमार',
  mahendra: 'महेन्द्र', narendra: 'नरेन्द्र', surendra: 'सुरेन्द्र', jitendra: 'जितेन्द्र',
  ravindra: 'रविन्द्र', bhanwar: 'भंवर', bhagwan: 'भगवान', narayan: 'नारायण',
  satyanarayan: 'सत्यनारायण', om: 'ओम', shiv: 'शिव', hari: 'हरि', prem: 'प्रेम',
  premchand: 'प्रेमचंद', premchandra: 'प्रेमचन्द्र', nemichand: 'नेमीचंद',
  champalal: 'चम्पालाल', champa: 'चम्पा', javrilal: 'जवरीलाल', banshilal: 'बंशीलाल',
  madan: 'मदन', mohanlal: 'मोहनलाल', vijay: 'विजय', ajay: 'अजय', sanjay: 'संजय',
  deepak: 'दीपक', pankaj: 'पंकज', manoj: 'मनोज', anil: 'अनिल', sunil: 'सुनील',
  kapil: 'कपिल', raju: 'राजू', raj: 'राज', suraj: 'सूरज', pukhraj: 'पुखराज',
  gamnaram: 'गमनाराम', ranulal: 'रानूलाल', parsamal: 'पारसमल', ramnivas: 'रामनिवास',
  banwari: 'बंवारी', kanhaiya: 'कन्हैया', kailash: 'कैलाश', bhawani: 'भवानी',
  kartik: 'कार्तिक', pratik: 'प्रतीक', nitin: 'नितिन', sachin: 'सचिन', rahul: 'राहुल',
  rohit: 'रोहित', mohit: 'मोहित', amit: 'अमित', sumit: 'सुमित', ankit: 'अंकित',
  vikas: 'विकास', vikram: 'विक्रम', arjun: 'अर्जुन', karan: 'करण', krish: 'कृष',
  yash: 'यश', harsh: 'हर्ष', dev: 'देव', jagdish: 'जगदीश', girdhari: 'गिरधारी',
  // common female names
  devi: 'देवी', kumari: 'कुमारी', kanwar: 'कंवर', bai: 'बाई', radha: 'राधा',
  sita: 'सीता', gita: 'गीता', geeta: 'गीता', anita: 'अनीता', sunita: 'सुनीता',
  savita: 'सविता', kavita: 'कविता', mamta: 'ममता', pushpa: 'पुष्पा', usha: 'उषा',
  asha: 'आशा', rekha: 'रेखा', suman: 'सुमन', santosh: 'संतोष', manju: 'मंजू',
  sanju: 'संजू', vimla: 'विमला', kamla: 'कमला', shanti: 'शांति', basanti: 'बसंती',
  parvati: 'पार्वती', laxmi: 'लक्ष्मी', lakshmi: 'लक्ष्मी', saraswati: 'सरस्वती',
  durga: 'दुर्गा', bhagwati: 'भगवती', leela: 'लीला', leeladevi: 'लीलादेवी',
  meera: 'मीरा', sarita: 'सरिता', babita: 'बबीता', anju: 'अंजू', pooja: 'पूजा',
  puja: 'पूजा', priya: 'प्रिया', priyanka: 'प्रियंका', neha: 'नेहा', nisha: 'निशा',
  monika: 'मोनिका', sonika: 'सोनिका', khushbu: 'खुशबू', anjali: 'अंजलि',
  diksha: 'दीक्षा', damini: 'दामिनी', raju_f: 'राजू', nitu: 'नीतू', neetu: 'नीतू',
  seema: 'सीमा', reema: 'रीमा', renu: 'रेनू', meenakshi: 'मीनाक्षी', komal: 'कोमल',
  payal: 'पायल', sapna: 'सपना', varsha: 'वर्षा', jyoti: 'ज्योति', deepika: 'दीपिका'
};

// consonants, longest token first
const CONS = [
  ['chh', 'छ'], ['ch', 'च'], ['kh', 'ख'], ['gh', 'घ'], ['jh', 'झ'],
  ['th', 'थ'], ['dh', 'ध'], ['ph', 'फ'], ['bh', 'भ'], ['sh', 'श'],
  ['k', 'क'], ['g', 'ग'], ['j', 'ज'], ['t', 'त'], ['d', 'द'], ['n', 'न'],
  ['p', 'प'], ['f', 'फ़'], ['b', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'],
  ['l', 'ल'], ['v', 'व'], ['w', 'व'], ['s', 'स'], ['h', 'ह'], ['q', 'क़'],
  ['z', 'ज़'], ['x', 'क्स'], ['c', 'क']
];

// vowels: [token, independent, matra]
const VOW = [
  ['aa', 'आ', 'ा'], ['ai', 'ऐ', 'ै'], ['au', 'औ', 'ौ'], ['ee', 'ई', 'ी'],
  ['oo', 'ऊ', 'ू'], ['a', 'अ', ''], ['i', 'इ', 'ि'], ['u', 'उ', 'ु'],
  ['e', 'ए', 'े'], ['o', 'ओ', 'ो']
];

function ruleWord(word) {
  let out = '';
  let pos = 0;
  let prevCons = false;
  while (pos < word.length) {
    let matched = false;
    for (const [tok, dev] of CONS) {
      if (word.startsWith(tok, pos)) {
        out += (prevCons ? '्' : '') + dev;
        prevCons = true;
        pos += tok.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    for (const [tok, ind, matra] of VOW) {
      if (word.startsWith(tok, pos)) {
        let m = matra;
        // heuristic: single 'a' in the last syllable sounds long (Kumar -> कुमार)
        if (tok === 'a' && prevCons) {
          const rest = word.slice(pos + 1);
          if (rest.length > 0 && !/[aeiou]/.test(rest)) m = 'ा';
        }
        out += prevCons ? m : ind;
        prevCons = false;
        pos += tok.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      out += word[pos]; // digits, dots etc. pass through
      prevCons = false;
      pos += 1;
    }
  }
  return out;
}

const cache = new Map();

// "Rajesh Kumar" -> "राजेश कुमार"
export function toHindi(name) {
  if (!name) return '';
  const hit = cache.get(name);
  if (hit) return hit;
  const out = String(name)
    .split(/\s+/)
    .map((w) => {
      const key = w.toLowerCase().replace(/[^a-z]/g, '');
      if (!key) return w;
      return DICT[key] || ruleWord(w.toLowerCase());
    })
    .join(' ');
  cache.set(name, out);
  return out;
}

"""Preview a corpus rebuild from pinned source extracts, preserving canonical edits.

The committed public/data/vocabulary.txt is the editable, canonical dataset.
This script never replaces existing stable-ID records with historical extracts.
Default output is /tmp/jeongyeon-corpus-preview; --write explicitly updates the
canonical TXT and Oxford metadata after preserving its records and unknown fields.
Inputs are pinned source extracts outside the checkout; see public/data/SOURCES.md.
No Oxford definitions, pronunciations or audio are imported. Run the separate
content-review and frequency exporters when intentionally changing those overlays.
"""
import argparse,json,re,hashlib
from pathlib import Path
from collections import Counter
from corpus_io import read_records,serialize_records
ROOT=Path(__file__).resolve().parents[1]
cli=argparse.ArgumentParser(description=__doc__)
cli.add_argument('source_directory',nargs='?',type=Path,default=Path('/workspace/scratch'))
cli.add_argument('--output',type=Path,default=Path('/tmp/jeongyeon-corpus-preview'))
cli.add_argument('--write',action='store_true',help='Explicitly write canonical corpus, preserving every existing stable-ID record')
args=cli.parse_args()
BASE=args.source_directory
canonical_path=ROOT/'public/data/vocabulary.txt'
if not args.write and (args.output/'vocabulary.txt').resolve()==canonical_path.resolve():
 cli.error('Preview output cannot replace canonical vocabulary.txt; use --write explicitly')
canonical_bytes=canonical_path.read_bytes()
canonical=read_records(canonical_path)
previous_metadata=json.loads((ROOT/'public/data/oxford-provenance.json').read_text())
index=json.loads((BASE/'lexi-oxford-full-index.json').read_text())
old_facts={f['sourceFactIndex']:f for f in previous_metadata['entries']+previous_metadata['additionalFacts']}
for fact in index['facts']:
 old=old_facts.get(fact['sourceFactIndex'])
 if old and any(old.get(k)!=fact.get(k) for k in ('word','homograph','sense','pos','cefr','list','page','source_row')):
  raise ValueError('Pinned Oxford facts changed: review the source version and migrate source_fact_index explicitly before rebuilding')
bilingual=json.loads((BASE/'lexi-dictionaries/oxford-bilingual-candidates.json').read_text())
candidates={x['word']:x for x in bilingual['entries']}
# Existing reviewed content is kept by stable ID.
def parse(text):
 return [dict(line.split(':',1) for line in block.strip().splitlines()) for block in text.split('\n---\n') if block.strip()]
seed=ROOT/'public/data/reviewed-vocabulary.txt'
if not seed.exists():raise FileNotFoundError('Missing immutable reviewed seed; canonical corpus was not changed')
reviewed={w['word'].strip():{k:v.lstrip() for k,v in w.items()} for w in parse(seed.read_text())}
posnames={'n.':'noun','v.':'verb','adj.':'adjective','adv.':'adverb','prep.':'preposition','pron.':'pronoun','det.':'determiner','conj.':'conjunction','exclam.':'interjection','modal v.':'modal verb','auxiliary v.':'auxiliary verb','number':'number','indefinite article':'article','definite article':'article','infinitive marker':'infinitive marker','ordinal number':'ordinal number'}
rank={'A1':0,'A2':1,'B1':2,'B2':3,'C1':4}
def authored(filename):
 return [{k:v.lstrip() for k,v in w.items()} for w in parse((ROOT/'data/authoring'/filename).read_text())]
manual={w['word']:(w['part_of_speech'],w['meaning_vi'],w['example_en'],w['example_vi']) for w in authored('oxford-additions.txt')}
def matching_tokens(f):
 return [x.strip() for x in re.split(r'[,/]',f['pos']) if x.strip()]
def compatible(token,block):
 parts=block['partsOfSpeech']
 if token in parts:return True
 if token in ['indefinite article','definite article']:return 'article' in parts
 if token in ['modal v.','auxiliary v.']:return 'v.' in parts
 return False
def exact(word,text):
 aliases=[x.strip() for x in word.split(',')] if ',' in word else [word]
 return any(re.search(r'(?<!\w)'+re.escape(a)+r'(?!\w)',text,re.I) for a in aliases)
def suitable_sense(s):
 d=s['definitionVi']
 return bool(d.strip()) and not any(x in d.lower() for x in ['bộm (nhiếp ảnh)','dạng viết phân biệt chữ','từ cổ','nghĩa cổ','tiếng địa phương','qoành'])
def sense_score(s):
 d=s['definitionVi'];return (0 if any(x in d.lower() for x in ['(kỹ thuật)','(y học)','(động vật học)','(quân sự)','(hàng hải)','(đánh bài)','(thực vật học)','(từ lóng)']) else 2)+(1 if s['examples'] else 0)
records=[];proof=[];references=[];chosen=[]
for g in index['groups']:
 word=g['word'];facts=[index['facts'][i] for i in g['sourceFactIndexes']]
 facts.sort(key=lambda f:rank[f['cefr']])
 source_fact=facts[0];w=None
 if word in reviewed:
  w=reviewed[word].copy();w['content_status']='reviewed'
  for f in facts:
   if any(posnames.get(t,t)==w['part_of_speech'] for t in matching_tokens(f)):
    source_fact=f;break
 elif word in manual:
  pos,vi,en,exvi=manual[word]
  source_fact=next((f for f in facts if any(posnames.get(t,t)==pos for t in matching_tokens(f))),source_fact)
  w={'id':'ox-'+hashlib.sha256(word.encode()).hexdigest()[:14]+'-01','word':word,'part_of_speech':pos,'meaning_vi':vi,'definition_en':'','example_en':en,'example_vi':exvi,'accepted_answers':word,'content_status':'reviewed','source':'Nghĩa và ví dụ tự biên soạn; dữ kiện từ/loại từ/CEFR đối chiếu danh sách Oxford.','note':''}
 else:
  options=[]
  for f in facts:
   for t in matching_tokens(f):
    for block in candidates[word]['blocks']:
     if compatible(t,block):
      for s in block['senses']:
       if suitable_sense(s):options.append((rank[f['cefr']],-sense_score(s),f,t,block,s))
  if options:
   options.sort(key=lambda x:(x[0],x[1]));_,_,source_fact,token,block,sense=options[0]
   examples=[e for e in sense['examples'] if e.get('en') and e.get('vi') and 'qoành' not in e['vi']]
   example=next((e for e in examples if exact(word,e['en'])),examples[0] if examples else {'en':'','vi':''})
   src=next(s for s in bilingual['sources'] if s['id']==block['source'])
   url=(f"https://github.com/{src['mirrorRepository']}/blob/{src['mirrorCommit']}/{src.get('mirrorPath','en-vi/star_anhviet.dict.dz')}" if 'mirrorRepository' in src else src['assetUrl'])
   w={'id':'ox-'+hashlib.sha256(word.encode()).hexdigest()[:14]+'-01','word':word,'part_of_speech':posnames.get(token,token),'meaning_vi':sense['definitionVi'],'definition_en':'','example_en':example['en'],'example_vi':example['vi'],'accepted_answers':word,'content_status':'dictionary','example_type':'source-context','source':f"Nghĩa/ngữ liệu: {src.get('name',src.get('attribution',''))}; {src.get('copyright',src.get('attribution',''))}; {src['license']}; {url}",'note':'Nội dung từ nguồn từ điển mở lịch sử, chưa rà soát thủ công từng mục; có thể có cách diễn đạt cũ hoặc lỗi nguồn. Nhãn CEFR thuộc đầu từ/loại từ trong Oxford, không chứng thực riêng nghĩa hoặc ví dụ này.'}
   chosen.append({'id':w['id'],'word':word,'source':src['id'],'lookup':block['lookup'],'posLabel':block['posLabel'],'definitionVi':sense['definitionVi'],'example':example,'definitionId':block.get('definitionId')})
  else:
   w={'id':'ox-'+hashlib.sha256(word.encode()).hexdigest()[:14]+'-01','word':word,'part_of_speech':posnames.get(matching_tokens(source_fact)[0],source_fact['pos']),'meaning_vi':'','definition_en':'','example_en':'','example_vi':'','accepted_answers':word,'content_status':'reference','source':'Đầu mục trong danh sách Oxford; chưa tìm được nghĩa Việt cùng từ loại đáng tin cậy.','note':'Chỉ tra cứu dữ kiện nguồn; không tạo bài kiểm tra hoặc tự ghi nhận đã học khi chưa có nghĩa phù hợp.'}
   references.append({'word':word,'part_of_speech':w['part_of_speech']})
 w['level']=source_fact['cefr'];w['source_fact_index']=str(source_fact['sourceFactIndex']);w['ipa']=w.get('ipa','');w['audio_word']=w.get('audio_word','');w['audio_example']=w.get('audio_example','')
 w['case_sensitive']='true' if any(c.isupper() for c in word) else ''
 if ',' in word:w['accepted_answers']='|'.join(x.strip() for x in word.split(','));w['example_type']='no-cloze'
 w['collections']=','.join(dict.fromkeys(['foundation',*w.get('collections','').split(','),*['oxford-'+('3000' if l=='Oxford 3000' else '5000') for l in g['sourceLists']]]));w['collections']=w['collections'].replace(',,',',').strip(',')
 src=next(s for s in index['provenance']['sources'] if s['list']==source_fact['list'])
 ox=f"{source_fact['list']}, tr. {source_fact['page']}, dòng: {source_fact['source_row']} [{source_fact['cefr']}]. Bản PDF lưu: {src['mirror_url']}"
 w['source']=w.get('source','')+' | '+ox
 w['topics']=w.get('topics','foundation')
 records.append(w);proof.append({'id':w['id'],**source_fact,'canonicalWord':word})
# Keep original reviewed entries first for existing learners.
order={word:i for i,word in enumerate(reviewed)}
records.sort(key=lambda w:order.get(w['word'],len(order)))
# Original phrasal/slang content, peer-reviewed issues applied explicitly.
pv=authored('phrasal-verbs.txt');slang=authored('slang.txt')
if (ROOT/'data/authoring/news-idioms.txt').exists():
 slang+=authored('news-idioms.txt')
records+=pv+slang
generated_ids={w['id']:w for w in records}
for word in canonical:
 generated=generated_ids.get(word['id'])
 if generated and word['word']!=generated['word']:
  raise ValueError('A generated ID has a different headword; canonical corpus was not changed')
# Preserve all manual corrections, source mappings, frequency/news metadata and
# field order; only append source entries that genuinely have a new stable ID.
canonical_ids={w['id'] for w in canonical}
new_records=[w for w in records if w['id'] not in canonical_ids]
for word in new_records:
 word['learning_status']='ready' if word['content_status']=='reviewed' else 'lookup'
 word['learning_note']='New source entry; review its selected meaning before practice.' if word['learning_status']=='lookup' else 'App-authored reviewed sense.'
records=canonical+new_records
facts_by_index={f['sourceFactIndex']:f for f in index['facts']}
previous_primary={f['id']:f['sourceFactIndex'] for f in previous_metadata['entries']}
proof=[]
for word in records:
 if 'oxford-' not in word.get('collections',''):continue
 fact_index=int(word.get('source_fact_index',previous_primary.get(word['id'],-1)))
 fact=facts_by_index[fact_index]
 if fact['word'].replace('’',"'")!=word['word'].replace('’',"'"):raise ValueError('Existing sense mapping conflicts with pinned headword')
 proof.append({'id':word['id'],**fact,'canonicalWord':word['word']})
references=[{'word':w['word'],'part_of_speech':w['part_of_speech']} for w in records if w['content_status']=='reference']
ids=[w['id'] for w in records];assert len(ids)==len(set(ids))
text=serialize_records(records)
metadata={**previous_metadata,'provenance':index['provenance'],'audit':index['audit'],'entries':proof,'additionalFacts':[f for f in index['facts'] if f['sourceFactIndex'] not in {x['sourceFactIndex'] for x in proof}], 'dictionarySources':bilingual['sources'],'coverage':{'oxfordHeadwords':len(proof),'entryCount':len(records),'reviewed':sum(w['content_status']=='reviewed' for w in records),'dictionary':sum(w['content_status']=='dictionary' for w in records),'reference':len(references),'phrasalSenses':sum('phrasal-verbs' in w.get('collections','').split(',') for w in records),'slangSenses':sum('slang' in w.get('collections','').split(',') for w in records),'learningReady':sum(w.get('learning_status')=='ready' for w in records),'lookupOnly':sum(w.get('learning_status')=='lookup' for w in records)}}
metadata['provenance']['authority_note']='Complete against pinned OUP-branded mirror PDFs. Direct publisher PDF requests returned HTTP403; current publisher-hosted bytes were not compared.'
metadata['coverage']['withBilingualContext']=sum(bool(w.get('example_en')) and bool(w.get('example_vi')) for w in records)
metadata['coverage']['missingContext']=sum(not w.get('example_en') or not w.get('example_vi') for w in records)
metadata['coverage']['referenceWords']=references
if metadata.get('contentReview'):metadata['contentReview']['canonicalVocabularySha256']=hashlib.sha256(text.encode()).hexdigest()
args.output.mkdir(parents=True,exist_ok=True)
(args.output/'vocabulary.txt').write_text(text,encoding='utf-8')
(args.output/'oxford-provenance.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
# This report describes generator candidates only, never claims to be provenance
# for preserved canonical records whose selected meanings may have been corrected.
(args.output/'historical-source-candidates.json').write_text(json.dumps(chosen,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(args.output/'unresolved-words.json').write_text(json.dumps(references,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if args.write:
 if canonical_path.read_bytes()!=canonical_bytes:raise RuntimeError('Canonical dataset changed during generation; rerun against its latest version')
 canonical_path.write_text(text,encoding='utf-8')
 (ROOT/'public/data/oxford-provenance.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'mode':'write' if args.write else 'preview','output':str(args.output),'preservedCanonicalEntries':len(canonical),'newStableIds':len(new_records),'coverage':metadata['coverage']},ensure_ascii=False))

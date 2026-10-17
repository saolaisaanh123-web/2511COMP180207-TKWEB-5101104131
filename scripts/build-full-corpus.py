"""Build editable UTF-8 learning data from audited Oxford metadata and licensed sources.
Inputs are pinned source extracts outside the checkout; see data/SOURCES.md.
No Oxford definitions, pronunciations or audio are imported.
"""
import json,re,hashlib,sys
from pathlib import Path
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
BASE=Path(sys.argv[1] if len(sys.argv)>1 else '/workspace/scratch')
index=json.loads((BASE/'lexi-oxford-full-index.json').read_text())
bilingual=json.loads((BASE/'lexi-dictionaries/oxford-bilingual-candidates.json').read_text())
candidates={x['word']:x for x in bilingual['entries']}
# Existing reviewed content is kept by stable ID.
def parse(text):
 return [dict(line.split(':',1) for line in block.strip().splitlines()) for block in text.split('\n---\n') if block.strip()]
seed=ROOT/'public/data/reviewed-vocabulary.txt'
if not seed.exists():seed.write_bytes((ROOT/'public/data/vocabulary.txt').read_bytes())
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
 w['level']=source_fact['cefr'];w['ipa']=w.get('ipa','');w['audio_word']=w.get('audio_word','');w['audio_example']=w.get('audio_example','')
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
records+=pv+slang
fields=['id','word','part_of_speech','meaning_vi','definition_en','ipa','level','topics','collections','collocation','example_en','example_vi','audio_word','audio_example','accepted_answers','source','note','content_status','example_type','register','region','case_sensitive']
ids=[w['id'] for w in records];assert len(ids)==len(set(ids))
text='\n---\n'.join('\n'.join((f'{k}: '+str(w.get(k,''))).rstrip() for k in fields) for w in records)+'\n'
(ROOT/'public/data/vocabulary.txt').write_text(text)
metadata={'provenance':index['provenance'],'audit':index['audit'],'entries':proof,'additionalFacts':[f for f in index['facts'] if f['sourceFactIndex'] not in {x['sourceFactIndex'] for x in proof}], 'dictionarySources':bilingual['sources'],'coverage':{'oxfordHeadwords':len(index['groups']),'entryCount':len(records),'reviewed':sum(w['content_status']=='reviewed' for w in records),'dictionary':sum(w['content_status']=='dictionary' for w in records),'reference':len(references),'phrasalSenses':len(pv),'slangSenses':len(slang)}}
metadata['provenance']['authority_note']='Complete against pinned OUP-branded mirror PDFs. Direct publisher PDF requests returned HTTP403; current publisher-hosted bytes were not compared.'
metadata['coverage']['withBilingualContext']=sum(bool(w.get('example_en')) and bool(w.get('example_vi')) for w in records)
metadata['coverage']['missingContext']=sum(not w.get('example_en') or not w.get('example_vi') for w in records)
metadata['coverage']['referenceWords']=references
(ROOT/'public/data/oxford-provenance.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n')
(BASE/'lexi-selected-dictionary-sources.json').write_text(json.dumps(chosen,ensure_ascii=False,indent=2)+'\n')
(BASE/'lexi-unresolved-words.json').write_text(json.dumps(references,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(metadata['coverage'],ensure_ascii=False));print('Unresolved',references)

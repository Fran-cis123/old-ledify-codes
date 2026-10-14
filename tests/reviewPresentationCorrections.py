"""Engineering QA of actual PDF text geometry and PNG text visibility."""
import json, re, pathlib, statistics
import pdfplumber
from PIL import Image, ImageDraw

root = pathlib.Path('generated/presentation-corrections').resolve()
report=[]
for name in ['cardiovascular','business','technology','education','research']:
    directory=root/name
    result=json.loads((directory/'result.json').read_text(encoding='utf-8'))
    pages=pdfplumber.open(directory/'presentation.pdf').pages
    source=result['generatedContent']['slides']
    assert len(pages)==len(source)
    thumbnails=[]
    deck={'name':name,'slides':[],'warnings':result.get('warnings',[])}
    for i,(page,slide) in enumerate(zip(pages,source)):
        words=page.extract_words(extra_attrs=['size'])
        overlaps=[]
        for a in range(len(words)):
            for b in range(a+1,len(words)):
                p,q=words[a],words[b]
                if min(p['x1'],q['x1'])-max(p['x0'],q['x0'])>1 and min(p['bottom'],q['bottom'])-max(p['top'],q['top'])>1:
                    overlaps.append([p['text'],q['text']])
        outside=[w['text'] for w in words if w['x0'] < -1 or w['x1']>page.width+1 or w['top']< -1 or w['bottom']>page.height+1]
        undersized=[w['text'] for w in words if w['size']<16.9 and not (w['text']==str(i+1) and w['top']>page.height*.9)]
        normalize=lambda t: re.sub(r'\s+','',t)
        text=normalize(page.extract_text() or '')
        missing=[]
        for field in ['title','subtitle']:
            if slide.get(field) and normalize(slide[field]) not in text:missing.append(field)
        image_path=pathlib.Path(result['preview']['slides'][i]['filePath'])
        image=Image.open(image_path).convert('RGB')
        sx,sy=image.width/page.width,image.height/page.height
        invisible=[]
        for word in words:
            box=(max(0,int(word['x0']*sx)),max(0,int(word['top']*sy)),min(image.width,int(word['x1']*sx)+1),min(image.height,int(word['bottom']*sy)+1))
            pixels=list(image.crop(box).convert('L').get_flattened_data())
            if pixels and max(pixels)-min(pixels)<12:invisible.append(word['text'])
        slide_report={'slideNumber':i+1,'missingTitlesOrSubtitles':missing,'overlappingWords':overlaps,'outsidePage':outside,'undersizedText':undersized,'invisiblePreviewWords':invisible,'pngSize':[image.width,image.height]}
        deck['slides'].append(slide_report)
        image.thumbnail((960,540))
        thumb=Image.new('RGB',(960,575),'white');thumb.paste(image,(0,35));ImageDraw.Draw(thumb).text((15,10),f'{name} - slide {i+1}',fill='black');thumbnails.append(thumb)
    cols=2;rows=(len(thumbnails)+1)//2
    sheet=Image.new('RGB',(cols*960,rows*575),'#e8e8e8')
    for i,thumb in enumerate(thumbnails):sheet.paste(thumb,((i%cols)*960,(i//cols)*575))
    sheet.save(directory/'contact-sheet.png')
    report.append(deck)
(root/'rendered-verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
failures=[(d['name'],s['slideNumber'],k,v) for d in report for s in d['slides'] for k,v in s.items() if k in ['missingTitlesOrSubtitles','overlappingWords','outsidePage','undersizedText','invisiblePreviewWords'] and v]
print(json.dumps({'decks':len(report),'slides':sum(len(d['slides']) for d in report),'failures':failures},ensure_ascii=True))
raise SystemExit(bool(failures))

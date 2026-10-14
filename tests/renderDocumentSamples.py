"""Engineering-only page inspection; no PDF route or production conversion.

Uses the packaged Documents renderer. Any intermediate PDF stays in private
QA output and is never a document-pipeline deliverable.
"""
import argparse
import json
import os
from pathlib import Path
import runpy
import sys
from PIL import Image, ImageOps, ImageDraw
import pdfplumber

parser=argparse.ArgumentParser()
parser.add_argument('--renderer',required=True)
parser.add_argument('--inspect-only',action='store_true')
parser.add_argument('names',nargs='*')
args=parser.parse_args()
os.environ['PATH']=r'C:\Program Files\LibreOffice\program;C:\Users\HP\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin;'+os.environ.get('PATH','')
root=Path('generated/document-samples').resolve()
names=args.names or ['academic','business','technical','letter','renewable']
report=[]
for name in names:
    directory=root/name
    if directory.resolve().parent != root:
        raise ValueError('Sample must be directly inside the document sample directory')
    if not (directory/'document.docx').exists():
        continue
    output=directory/'qa'
    if not args.inspect_only:
        sys.argv=[args.renderer,str(directory/'document.docx'),'--output_dir',str(output),'--dpi','110','--emit_pdf']
        runpy.run_path(args.renderer,run_name='__main__')
    pages=sorted(output.glob('page-*.png'),key=lambda p:int(p.stem.split('-')[-1]))
    with pdfplumber.open(output/'document.pdf') as pdf:
        issues=[]
        for i,page in enumerate(pdf.pages,1):
            words=page.extract_words()
            if not words:issues.append({'page':i,'issue':'empty page'})
            for word in words:
                if word['x0']<0 or word['x1']>page.width+1 or word['top']<0 or word['bottom']>page.height+1:issues.append({'page':i,'issue':'text beyond page'})
        page_count=len(pdf.pages)
    for stale in pages:
        if int(stale.stem.split('-')[-1]) > page_count and stale.resolve().parent == output.resolve():
            stale.unlink()
    pages=[page for page in pages if int(page.stem.split('-')[-1]) <= page_count]
    if len(pages)!=page_count:
        issues.append({'issue':'missing rendered page images'})
    result=json.loads((directory/'result.json').read_text())
    report.append({'name':name,'pages':page_count,'requestedPages':result['length']['requestedPages'],'paginationMatchesRequest':result['length']['requestedPages'] in [None,page_count],'issues':issues})
    width,height=360,510
    sheet=Image.new('RGB',(width*min(len(pages),3),height*((len(pages)+2)//3)), '#dfe3e6')
    for i,path in enumerate(pages):
        with Image.open(path) as page:
            page.thumbnail((width-16,height-32))
            x=(i%3)*width+(width-page.width)//2;y=(i//3)*height+24
            sheet.paste(page,(x,y));ImageDraw.Draw(sheet).text(((i%3)*width+10,(i//3)*height+5),f'{name} page {i+1}',fill='black')
    sheet.save(directory/'contact-sheet.png')
    print(name,page_count,'pages',len(issues),'geometry issues')
(root/'rendered-verification.json').write_text(json.dumps(report,indent=2))

// Executed by the optional QA worker and the release screenshot harness.
export async function checkWebsiteBrowser(page){
    const result=await page.evaluate(()=>{
        const failures=[];
        if(document.documentElement.scrollWidth>innerWidth+1)failures.push({code:'overflow'});
        for(const image of document.images)if(!image.complete||!image.naturalWidth)failures.push({code:'broken-image'});
        for(const node of document.querySelectorAll('main h1,main h2,main h3,main p,main article')){
            const box=node.getBoundingClientRect(),style=getComputedStyle(node);
            if(box.width&& (box.left< -1||box.right>innerWidth+1))failures.push({code:'overflow'});
            if(node.scrollHeight>node.clientHeight+2&&['hidden','clip'].includes(style.overflowY))failures.push({code:'clipped'});
        }
        if(parseFloat(getComputedStyle(document.body).fontSize)<16)failures.push({code:'small-body-text'});
        if(parseFloat(getComputedStyle(document.querySelector('h1')).fontSize)<32)failures.push({code:'missing-styles'});
        for(const link of document.querySelectorAll('a[href^="#"]'))if(!document.getElementById(link.getAttribute('href').slice(1)))failures.push({code:'broken-navigation'});
        const nodes=[...document.querySelectorAll('.hero h1,.hero-description,.hero-actions,.header .brand,.header .nav a,.menu-toggle')].filter(node=>node.getClientRects().length);
        for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){
            if(nodes[i].contains(nodes[j])||nodes[j].contains(nodes[i]))continue;
            const a=nodes[i].getBoundingClientRect(),b=nodes[j].getBoundingClientRect();
            if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2)failures.push({code:'overlap'});
        }
        const h1=getComputedStyle(document.querySelector('h1'));
        return {failures,images:document.images.length,bodyFont:getComputedStyle(document.body).fontSize,headingFont:h1.fontSize,headingFamily:h1.fontFamily,pageHeight:document.documentElement.scrollHeight};
    });
    const toggle=page.locator('.menu-toggle');
    if(await toggle.isVisible()){
        await toggle.click();
        if(await toggle.getAttribute('aria-expanded')!=='true'||!await page.locator('#main-nav').isVisible())result.failures.push({code:'mobile-navigation'});
        await page.keyboard.press('Escape');
        if(await toggle.getAttribute('aria-expanded')!=='false')result.failures.push({code:'mobile-navigation'});
    }
    return result;
}

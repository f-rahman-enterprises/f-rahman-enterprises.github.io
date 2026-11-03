// Shared SVG vocabulary. All navigation arrows use the same rightward direction.
const paths={home:'m3 10 9-7 9 7v11h-6v-7H9v7H3V10',grid:'M3 3h7v7H3V3Zm11 0h7v7h-7V3ZM3 14h7v7H3v-7Zm11 0h7v7h-7v-7',pause:'M9 5v14M15 5v14',play:'m8 5 11 7-11 7V5Z',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',arrow:'M4 12h16m-6-6 6 6-6 6',chevron:'m6 9 6 6 6-6',search:'m21 21-5-5M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15',plus:'M12 5v14M5 12h14',close:'m6 6 12 12M6 18 18 6',reset:'M3 10a9 9 0 1 1 2 8M3 4v6h6',check:'m5 12 4 4L19 6',help:'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',box:'m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v10',phone:'M8 3 4 5c-2 7 8 17 15 15l2-4-5-3-2 2-5-5 2-2-3-5',mail:'M3 5h18v14H3V5Zm0 1 9 7 9-7',pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Zm-5 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',chat:'M21 11.5a9 9 0 0 1-13 8L3 21l1.5-5A9 9 0 1 1 21 11.5ZM8 11h8m-8 4h5'};
export function icon(name){return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.arrow}"/></svg>`;}
class SiteIcon extends HTMLElement{connectedCallback(){this.setAttribute('aria-hidden','true');this.innerHTML=icon(this.getAttribute('name'));}}
customElements.define('site-icon',SiteIcon);

// Light DOM only: the control and its list share the site's stylesheet.
class FreSelect extends HTMLElement{
 connectedCallback(){
  if(this.ready)return;this.ready=true;this._options=[];this._value=this.getAttribute('value')||'';
  const label=this.getAttribute('label')||'Select an option';
  this.innerHTML=`<button type="button" class="select-trigger" role="combobox" aria-label="${label}" aria-haspopup="listbox" aria-expanded="false" aria-controls="${this.id}-options"><span class="select-value"></span>${icon('chevron')}</button><div class="select-menu" id="${this.id}-options" role="listbox" aria-label="${label}" hidden></div>`;
  this.trigger=this.querySelector('button');this.menu=this.querySelector('.select-menu');
  this.trigger.addEventListener('click',()=>this.toggle());
  this.addEventListener('keydown',e=>this.key(e));
  this.menu.addEventListener('click',e=>{const b=e.target.closest('[role=option]');if(b)this.choose(Number(b.dataset.index));});
  this.menu.addEventListener('mousedown',e=>{if(e.target.closest('[role=option]'))e.preventDefault();});
  this.outside=e=>{if(!this.contains(e.target))this.close();};document.addEventListener('click',this.outside);
  this.addEventListener('focusout',()=>queueMicrotask(()=>{if(!this.contains(document.activeElement))this.close();}));
 }
 disconnectedCallback(){document.removeEventListener('click',this.outside);}
 set options(options){this._options=options;this.draw();}
 get value(){return this._value;}
 set value(value){this._value=String(value);this.draw();}
 draw(){if(!this.menu)return;this.menu.replaceChildren();
  this._options.forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.className='select-option';b.setAttribute('role','option');b.setAttribute('aria-selected',o.value===this.value);b.tabIndex=-1;b.dataset.index=i;const text=document.createElement('span');text.textContent=o.label;b.append(text);if(o.value===this.value)b.insertAdjacentHTML('beforeend',icon('check'));this.menu.append(b);});
  this.querySelector('.select-value').textContent=this._options.find(o=>o.value===this.value)?.label||this._options[0]?.label||'';
 }
 toggle(){if(this.menu.hidden){document.querySelectorAll('fre-select').forEach(s=>{if(s!==this)s.close();});this.classList.remove('drop-up');this.menu.hidden=false;if(this.menu.getBoundingClientRect().bottom>innerHeight-12)this.classList.add('drop-up');this.trigger.setAttribute('aria-expanded','true');this.active=Math.max(0,this._options.findIndex(o=>o.value===this.value));this.focusOption();}else this.close();}
 close(){if(!this.menu)return;this.menu.hidden=true;this.trigger.setAttribute('aria-expanded','false');}
 focusOption(){this.menu.children[this.active]?.focus();}
 choose(i){this.value=this._options[i].value;this.close();this.trigger.focus();this.dispatchEvent(new Event('change',{bubbles:true}));}
 key(e){const k=e.key;if(k==='Escape'){e.preventDefault();this.close();this.trigger.focus();return;}
  if(['ArrowDown','ArrowUp','Home','End'].includes(k)){e.preventDefault();if(this.menu.hidden){this.toggle();return;}this.active=k==='Home'?0:k==='End'?this._options.length-1:(this.active+(k==='ArrowDown'?1:-1)+this._options.length)%this._options.length;this.focusOption();}
  else if((k==='Enter'||k===' ')&&!this.menu.hidden&&e.target!==this.trigger){e.preventDefault();this.choose(this.active);}
  else if(k.length===1&&k!==' '){const i=this._options.findIndex(o=>o.label.toLowerCase().startsWith(k.toLowerCase()));if(i>=0){if(this.menu.hidden)this.toggle();this.active=i;this.focusOption();}}
 }
}
customElements.define('fre-select',FreSelect);

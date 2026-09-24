const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const html=fs.readFileSync(__dirname+'/admin.html','utf8');
const future=Math.floor(Date.now()/1000)+3600;

async function openCase(browser,{stored,authorized=true}){
 const page=await browser.newPage({viewport:{width:390,height:844}}),calls=[];
 page.on('request',request=>calls.push(request.url()));
 await page.route('**/*',async route=>{
  const url=route.request().url();
  if(url==='http://test.local/admin.html')return route.fulfill({contentType:'text/html',body:html});
  if(url.includes('/rpc/is_xv_admin'))return route.fulfill({contentType:'application/json',body:String(authorized)});
  if(url.includes('/auth/v1/token'))return route.fulfill({contentType:'application/json',body:JSON.stringify({access_token:'new-token',refresh_token:'refresh',expires_in:3600,user:{email:'admin@example.com'}})});
  if(url.includes('supabase.co'))return route.fulfill({contentType:'application/json',body:'[]'});
  return route.abort();
 });
 if(stored)await page.addInitScript(value=>sessionStorage.setItem('clarissa_xv_admin_session',JSON.stringify(value)),stored);
 await page.goto('http://test.local/admin.html');
 return {page,calls};
}

(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  let test=await openCase(browser,{stored:{access_token:'kept',refresh_token:'refresh',expires_at:future,user:{email:'roberto@example.com'}},authorized:true});
  await test.page.locator('#dashboard:not(.hidden)').waitFor();
  assert(test.calls.some(url=>url.includes('/rpc/is_xv_admin')),'restored session must be checked');
  await test.page.close();

  test=await openCase(browser,{stored:{access_token:'blocked',refresh_token:'refresh',expires_at:future,user:{email:'visitor@example.com'}},authorized:false});
  await test.page.locator('#loginCard:not(.hidden)').waitFor();
  assert.equal(await test.page.evaluate(()=>sessionStorage.getItem('clarissa_xv_admin_session')),null);
  await test.page.close();

  test=await openCase(browser,{authorized:true});
  await test.page.locator('#email').fill('clariserosa20@gmail.com');await test.page.locator('#password').fill('test-password');await test.page.locator('#loginButton').click();
  await test.page.locator('#dashboard:not(.hidden)').waitFor();
  assert(test.calls.some(url=>url.includes('/rpc/is_xv_admin')),'fresh login must be checked');
  assert.equal(await test.page.locator('#adminIdentity').textContent(),'admin@example.com');
  await test.page.close();

  console.log('PASS admin auth: restored allowlisted session, blocked restored session, fresh allowlisted login');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});

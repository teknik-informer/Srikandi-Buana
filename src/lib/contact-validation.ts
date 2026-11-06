export function isValidContact(value:string):boolean{
 const contact=value.trim();
 if(contact.includes('@'))return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)&&contact.length<=180;
 if(!/^\+?[\d\s().-]+$/.test(contact))return false;
 const number=contact.replace(/\D/g,'');return number.length>=9&&number.length<=15;
}

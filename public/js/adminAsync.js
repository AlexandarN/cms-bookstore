const deleteProduct = (btn) => {
     const prodId = btn.parentNode.querySelector('[name=productId]').value;
     const csrf = btn.parentNode.querySelector('[name=_csrf]').value;
     const prodHtmlElement = btn.closest('tr');
     fetch('/admin/product/' + prodId, {
          method: 'DELETE',
          headers: {
               'csrf-token': csrf
          }
     })
     .then(result => {
          return result.json(); 
     })
     .then(data => {
          console.log(data);
               // for all browsers except IE
          // prodHtmlElement.remove();
               // for Internet Explorer and all other browsers
          prodHtmlElement.parentNode.removeChild(prodHtmlElement);
     })
     .catch(err => console.log(err));
}
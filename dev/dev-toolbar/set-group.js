// Runs in the browser. The toolbar's group dropdown (and the Groups page) remember the choice in a "dev_group" cookie.
function devSetGroup(id) {
  document.cookie = id ? "dev_group=" + id + "; path=/; max-age=31536000" : "dev_group=; path=/; max-age=0";
}

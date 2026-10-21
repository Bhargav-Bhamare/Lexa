
const ShoppingItem = require("../models/ShoppingItem");

async function listShoppingItems() {
  return await ShoppingItem.find().sort({ createdAt: -1 });
}

async function createShoppingItem(itemData){
  return await ShoppingItem.create(itemData);
}

module.exports = {
  listShoppingItems,
  createShoppingItem,
};


const ShoppingItem = require("../models/ShoppingItem");

async function listShoppingItems() {
  return await ShoppingItem.find().sort({ createdAt: -1 });
}

async function createShoppingItem(itemData){
  return await ShoppingItem.create(itemData);
}

async function updateShoppingItem(itemId, updates) {
  return await ShoppingItem.findByIdAndUpdate(
    itemId,
    updates,
    {
      new: true,
      runValidators: true,
    }
  );
}

async function deleteShoppingItem(itemId) {
  return await ShoppingItem.findByIdAndDelete(itemId);
}


module.exports = {
  listShoppingItems,
  createShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
};


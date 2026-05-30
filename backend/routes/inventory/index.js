const express = require('express');
const { getEndpointPath, API_ENDPOINTS } = require('../../config/api.config');
const router = express.Router();

// Import sub-routes
const itemsRouter = require('./items');

// Mount sub-routes
router.use('/items', itemsRouter);

// Placeholder message for other routes
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Inventory Management API',
    availableEndpoints: [
      '/items - Item master management',
      '/suppliers - Supplier management (coming soon)',
      '/purchase-requests - Purchase request workflow (coming soon)',
      '/purchase-orders - Purchase order management (coming soon)',
      '/grn - Goods receipt notes (coming soon)',
      '/stock - Stock operations (coming soon)',
      '/reports - Inventory reports (coming soon)'
    ]
  });
});

module.exports = router;

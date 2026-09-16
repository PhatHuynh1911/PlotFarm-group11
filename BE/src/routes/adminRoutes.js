const express = require('express');
const admin = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const { uploadPlotImage } = require('../middleware/uploadMiddleware');
const { getFarmers, getAssignments, createAssignment } = require('../controllers/assignmentController');
 
const router = express.Router();
router.use(authenticate, authorize('quan_tri'));
router.get('/dashboard', admin.dashboard);
router.get('/stats', admin.dashboard);
router.get('/users', admin.users);
router.patch('/users/:id', admin.updateUser);
router.get('/plots', admin.plots);
router.post('/plots', uploadPlotImage.single('image'), admin.createPlot);
router.patch('/plots/:id', uploadPlotImage.single('image'), admin.updatePlot);
router.get('/rentals', admin.rentals);
// Quản lý Yêu cầu dịch vụ / Khiếu nại (YeuCauDichVu) - gộp cả LienHeTuVan cho màn hình quản trị
router.get('/YeuCauDichVu', admin.requests);
router.put('/YeuCauDichVu/:id', admin.updateRequest);
// Alias cũ (giữ để tương thích ngược)
router.get('/requests', admin.requests);
router.patch('/requests/:id', admin.updateRequest);
router.get('/farmers', getFarmers);
router.get('/assignments', getAssignments);
router.post('/assignments', createAssignment);
 
module.exports = router;
 
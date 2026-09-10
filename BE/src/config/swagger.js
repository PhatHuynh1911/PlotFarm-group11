const swaggerUi = require('swagger-ui-express');

const swaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Eleven PlotFarm API Documentation - Nhóm 11',
        version: '1.0.0',
        description: 'Tài liệu và công cụ kiểm thử tương tác API cho nền tảng thuê ô đất canh tác số hóa PlotFarm. Phục vụ kết nối Frontend React và Backend Express + SQL Server.',
        contact: {
            name: 'PlotFarm Group 11 (Sơn & Quý - Backend, Phát & Nhật - Frontend)',
            email: 'admin@plotfarm.vn'
        }
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Local Development Server (Port 5000)'
        }
    ],
    tags: [
        { name: '1. Auth', description: 'Đăng nhập, đăng ký tài khoản và thông tin người dùng' },
        { name: '2. Plots', description: 'Danh sách và thông tin chi tiết ô đất canh tác' },
        { name: '3. Crops', description: 'Danh mục và thông tin giống cây trồng' },
        { name: '4. Rentals', description: 'Hợp đồng thuê đất (tạo hợp đồng, danh sách thuê)' },
        { name: '5. Journals', description: 'Nhật ký canh tác hàng ngày (nông dân viết, khách hàng theo dõi)' },
        { name: '6. Services', description: 'Yêu cầu dịch vụ chăm sóc vườn (tưới nước, bón phân, xử lý sâu bệnh)' },
        { name: '7. Cameras', description: 'Luồng camera trực tuyến IoT giám sát ô đất' },
        { name: '8. Contact', description: 'Biểu mẫu tiếp nhận tư vấn từ khách hàng tiềm năng' },
        { name: '9. Admin', description: 'Báo cáo thống kê, quản lý người dùng, duyệt hợp đồng & yêu cầu' }
    ],
    paths: {
        // --- 1. AUTH ---
        '/api/auth/login': {
            post: {
                tags: ['1. Auth'],
                summary: 'Đăng nhập hệ thống',
                description: 'Đăng nhập bằng email và mật khẩu (Mật khẩu mặc định tài khoản mẫu: 12345)',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['email', 'password'],
                                properties: {
                                    email: { type: 'string', example: 'customer@plotfarm.vn' },
                                    password: { type: 'string', example: '12345' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Đăng nhập thành công, trả về thông tin user và vai trò' },
                    401: { description: 'Sai email hoặc mật khẩu' }
                }
            }
        },
        '/api/auth/register': {
            post: {
                tags: ['1. Auth'],
                summary: 'Đăng ký tài khoản mới',
                description: 'Đăng ký tài khoản khách hàng hoặc nông dân',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['name', 'email', 'password'],
                                properties: {
                                    name: { type: 'string', example: 'Nguyễn Văn A' },
                                    email: { type: 'string', example: 'nguyenvana@gmail.com' },
                                    password: { type: 'string', example: '123456' },
                                    role: { type: 'string', enum: ['khach_hang', 'nong_dan'], default: 'khach_hang', example: 'khach_hang' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Đăng ký thành công' },
                    409: { description: 'Email đã tồn tại' }
                }
            }
        },
        '/api/auth/me': {
            get: {
                tags: ['1. Auth'],
                summary: 'Lấy thông tin người dùng theo ID',
                parameters: [
                    { name: 'userId', in: 'query', required: true, schema: { type: 'integer', example: 3 }, description: 'Mã người dùng' }
                ],
                responses: {
                    200: { description: 'Thông tin tài khoản thành công' }
                }
            }
        },

        // --- 2. PLOTS ---
        '/api/plots': {
            get: {
                tags: ['2. Plots'],
                summary: 'Lấy danh sách tất cả các ô đất',
                responses: {
                    200: { description: 'Danh sách các ô đất từ bảng ODat' }
                }
            }
        },
        '/api/plots/{idOrCode}': {
            get: {
                tags: ['2. Plots'],
                summary: 'Xem chi tiết một ô đất theo ID hoặc số hiệu ô (VD: B-07 hoặc 1)',
                parameters: [
                    { name: 'idOrCode', in: 'path', required: true, schema: { type: 'string', example: 'B-07' } }
                ],
                responses: {
                    200: { description: 'Chi tiết ô đất' },
                    404: { description: 'Không tìm thấy ô đất' }
                }
            }
        },
        '/api/plots/{id}/status': {
            patch: {
                tags: ['2. Plots'],
                summary: 'Cập nhật trạng thái ô đất (trống, đang chọn, đã thuê, bảo trì)',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['trong', 'dang_chon', 'da_thue', 'bao_tri'], example: 'trong' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Cập nhật trạng thái thành công' }
                }
            }
        },

        // --- 3. CROPS ---
        '/api/crops': {
            get: {
                tags: ['3. Crops'],
                summary: 'Lấy danh sách tất cả các loại cây trồng',
                responses: {
                    200: { description: 'Danh sách cây trồng kèm hình ảnh, thời gian thu hoạch' }
                }
            }
        },
        '/api/crops/{id}': {
            get: {
                tags: ['3. Crops'],
                summary: 'Xem chi tiết giống cây trồng theo ID',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
                ],
                responses: {
                    200: { description: 'Chi tiết giống cây' }
                }
            }
        },

        // --- 4. RENTALS ---
        '/api/rentals': {
            get: {
                tags: ['4. Rentals'],
                summary: 'Lấy danh sách toàn bộ hợp đồng thuê đất',
                responses: {
                    200: { description: 'Danh sách hợp đồng' }
                }
            },
            post: {
                tags: ['4. Rentals'],
                summary: 'Tạo hợp đồng thuê ô đất mới',
                description: 'Tự động kiểm tra ô đất trống và chuyển trạng thái sang "da_thue" bằng SQL Transaction',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['ma_nguoi_dung', 'ma_o_dat', 'thoi_han_thang'],
                                properties: {
                                    so_hop_dong: { type: 'string', example: 'HDT-2026-999' },
                                    ma_nguoi_dung: { type: 'integer', example: 3 },
                                    ma_o_dat: { type: 'integer', example: 1 },
                                    ma_cay_trong: { type: 'integer', example: 1 },
                                    thoi_han_thang: { type: 'integer', example: 3 },
                                    ngay_bat_dau: { type: 'string', format: 'date', example: '2026-09-10' },
                                    ngay_ket_thuc: { type: 'string', format: 'date', example: '2026-12-10' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Tạo hợp đồng thuê thành công' }
                }
            }
        },
        '/api/rentals/user/{userId}': {
            get: {
                tags: ['4. Rentals'],
                summary: 'Lấy danh sách hợp đồng của một người dùng cụ thể',
                parameters: [
                    { name: 'userId', in: 'path', required: true, schema: { type: 'integer', example: 3 } }
                ],
                responses: {
                    200: { description: 'Hợp đồng của khách hàng' }
                }
            }
        },
        '/api/rentals/active': {
            get: {
                tags: ['4. Rentals'],
                summary: 'Lấy danh sách các ô đất đang được thuê & canh tác (Dành cho Nông dân)',
                responses: {
                    200: { description: 'Danh sách ô đất đang canh tác kèm thông tin cây trồng và người thuê' }
                }
            }
        },

        // --- 5. JOURNALS ---
        '/api/journals': {
            post: {
                tags: ['5. Journals'],
                summary: 'Nông dân tạo bài viết nhật ký canh tác',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['ma_hop_dong', 'tieu_de', 'noi_dung'],
                                properties: {
                                    ma_hop_dong: { type: 'integer', example: 1 },
                                    ma_nong_dan: { type: 'integer', example: 2 },
                                    giai_doan_sinh_truong: { type: 'string', example: 'Sinh trưởng' },
                                    tieu_de: { type: 'string', example: 'Tưới nước buổi sáng và bón phân hữu cơ' },
                                    noi_dung: { type: 'string', example: 'Cây phát triển đều, lá xanh tốt, độ ẩm đất 65%.' },
                                    hinh_anh: { type: 'string', example: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9' },
                                    luong_nuoc_tuoi_lit: { type: 'number', example: 10 },
                                    loai_phan_bon: { type: 'string', example: 'Phân trùn quế vi sinh' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Thêm nhật ký canh tác thành công' }
                }
            }
        },
        '/api/journals/rental/{rentalId}': {
            get: {
                tags: ['5. Journals'],
                summary: 'Lấy lịch sử nhật ký canh tác theo mã hợp đồng',
                parameters: [
                    { name: 'rentalId', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
                ],
                responses: {
                    200: { description: 'Danh sách nhật ký canh tác xếp theo ngày mới nhất' }
                }
            }
        },

        // --- 6. SERVICES ---
        '/api/services/types': {
            get: {
                tags: ['6. Services'],
                summary: 'Lấy danh mục các loại dịch vụ chăm sóc vườn',
                responses: {
                    200: { description: 'Danh sách dịch vụ (Tưới nước, Bón phân, Tỉa cành, Trừ sâu)' }
                }
            }
        },
        '/api/services': {
            post: {
                tags: ['6. Services'],
                summary: 'Khách hàng gửi yêu cầu dịch vụ chăm sóc vườn',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['ma_hop_dong', 'ma_khach_hang', 'ma_loai_dich_vu'],
                                properties: {
                                    ma_hop_dong: { type: 'integer', example: 1 },
                                    ma_khach_hang: { type: 'integer', example: 3 },
                                    ma_loai_dich_vu: { type: 'integer', example: 1 },
                                    ngay_yeu_cau_thuc_hien: { type: 'string', format: 'date', example: '2026-09-12' },
                                    ghi_chu_cua_khach: { type: 'string', example: 'Nhờ bón thêm phân hữu cơ vi sinh trước đợt mưa.' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Gửi yêu cầu dịch vụ thành công' }
                }
            }
        },
        '/api/services/user/{userId}': {
            get: {
                tags: ['6. Services'],
                summary: 'Xem danh sách các yêu cầu dịch vụ do một khách hàng gửi',
                parameters: [
                    { name: 'userId', in: 'path', required: true, schema: { type: 'integer', example: 3 } }
                ],
                responses: {
                    200: { description: 'Danh sách yêu cầu dịch vụ của khách' }
                }
            }
        },
        '/api/services/all': {
            get: {
                tags: ['6. Services'],
                summary: 'Lấy tất cả yêu cầu dịch vụ (cho Nông dân & Admin tiếp nhận)',
                responses: {
                    200: { description: 'Toàn bộ danh sách yêu cầu' }
                }
            }
        },
        '/api/services/{id}/status': {
            patch: {
                tags: ['6. Services'],
                summary: 'Cập nhật tiến độ xử lý yêu cầu chăm sóc',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['status'],
                                properties: {
                                    status: { type: 'string', enum: ['cho_tiep_nhan', 'da_tiep_nhan', 'dang_thuc_hien', 'hoan_thanh', 'tu_choi'], example: 'dang_thuc_hien' },
                                    ma_nong_dan_xu_ly: { type: 'integer', example: 2 },
                                    phan_hoi_cua_nong_dan: { type: 'string', example: 'Đã hoàn thành bón phân và tưới ẩm lại đất.' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Cập nhật trạng thái yêu cầu thành công' }
                }
            }
        },

        // --- 7. CAMERAS ---
        '/api/camera/stream/{plotId}': {
            get: {
                tags: ['7. Cameras'],
                summary: 'Lấy luồng live stream camera theo mã ô đất hoặc số hiệu ô',
                parameters: [
                    { name: 'plotId', in: 'path', required: true, schema: { type: 'string', example: '1' } }
                ],
                responses: {
                    200: { description: 'Thông tin luồng RTSP / HLS stream và camera ID' }
                }
            }
        },
        '/api/camera/plot/{plotId}': {
            get: {
                tags: ['7. Cameras'],
                summary: 'Lấy danh sách tất cả camera gắn tại một ô đất',
                parameters: [
                    { name: 'plotId', in: 'path', required: true, schema: { type: 'string', example: '1' } }
                ],
                responses: {
                    200: { description: 'Danh sách camera của ô đất' }
                }
            }
        },

        // --- 8. CONTACT ---
        '/api/contact': {
            post: {
                tags: ['8. Contact'],
                summary: 'Tiếp nhận thông tin khách hàng đăng ký tư vấn tại Landing page',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['ho_va_ten', 'so_dien_thoai'],
                                properties: {
                                    ho_va_ten: { type: 'string', example: 'Trần Văn Nam' },
                                    so_dien_thoai: { type: 'string', example: '0905123456' },
                                    email: { type: 'string', example: 'namtran@gmail.com' },
                                    ma_o_dat_quan_tam: { type: 'integer', example: 1 },
                                    noi_dung_tu_van: { type: 'string', example: 'Tôi quan tâm ô đất 24m² để trồng dâu tây' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Đã gửi thông tin liên hệ thành công' }
                }
            }
        },
        '/api/contact/all': {
            get: {
                tags: ['8. Contact'],
                summary: 'Lấy danh sách khách hàng để lại thông tin tư vấn (Admin)',
                responses: {
                    200: { description: 'Danh sách liên hệ' }
                }
            }
        },

        // --- 9. ADMIN ---
        '/api/admin/dashboard': {
            get: {
                tags: ['9. Admin'],
                summary: 'Lấy số liệu tổng quan hệ thống và biểu đồ doanh thu',
                responses: {
                    200: { description: 'Số liệu người dùng, ô đất, hợp đồng, doanh thu' }
                }
            }
        },
        '/api/admin/users': {
            get: {
                tags: ['9. Admin'],
                summary: 'Lấy danh sách toàn bộ tài khoản người dùng',
                responses: {
                    200: { description: 'Danh sách tài khoản' }
                }
            }
        },
        '/api/admin/users/{id}': {
            patch: {
                tags: ['9. Admin'],
                summary: 'Cập nhật phân quyền hoặc khóa/mở tài khoản người dùng',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 3 } }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    role: { type: 'string', enum: ['khach_hang', 'nong_dan', 'quan_tri'], example: 'khach_hang' },
                                    status: { type: 'string', enum: ['hoat_dong', 'bi_khoa'], example: 'hoat_dong' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Cập nhật tài khoản thành công' }
                }
            }
        },
        '/api/admin/plots': {
            get: {
                tags: ['9. Admin'],
                summary: 'Lấy danh sách ô đất kèm thông tin chi tiết dành cho Admin',
                responses: {
                    200: { description: 'Danh sách ô đất' }
                }
            },
            post: {
                tags: ['9. Admin'],
                summary: 'Thêm mới một ô đất vào hệ thống',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                required: ['farmId', 'code', 'name', 'area', 'price'],
                                properties: {
                                    farmId: { type: 'integer', example: 1 },
                                    code: { type: 'string', example: 'D-01' },
                                    name: { type: 'string', example: 'Ô đất D-01 Khu Trái Cây' },
                                    area: { type: 'number', example: 30 },
                                    price: { type: 'number', example: 550000 },
                                    status: { type: 'string', enum: ['trong', 'da_thue', 'bao_tri'], example: 'trong' },
                                    description: { type: 'string', example: 'Đất phù sa giàu mùn' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    201: { description: 'Tạo ô đất mới thành công' }
                }
            }
        },
        '/api/admin/plots/{id}': {
            patch: {
                tags: ['9. Admin'],
                summary: 'Chỉnh sửa thông tin ô đất',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    code: { type: 'string', example: 'A-01' },
                                    name: { type: 'string', example: 'Ô Đất A-01 Rau Hữu Cơ' },
                                    area: { type: 'number', example: 24 },
                                    price: { type: 'number', example: 490000 },
                                    status: { type: 'string', example: 'trong' },
                                    description: { type: 'string', example: 'Đất thịt tơi xốp' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Cập nhật ô đất thành công' }
                }
            }
        },
        '/api/admin/rentals': {
            get: {
                tags: ['9. Admin'],
                summary: 'Lấy danh sách tất cả các hợp đồng và trạng thái thanh toán',
                responses: {
                    200: { description: 'Danh sách đơn thuê' }
                }
            }
        },
        '/api/admin/requests': {
            get: {
                tags: ['9. Admin'],
                summary: 'Lấy danh sách các yêu cầu chăm sóc & khiếu nại',
                responses: {
                    200: { description: 'Danh sách yêu cầu' }
                }
            }
        },
        '/api/admin/requests/{id}': {
            patch: {
                tags: ['9. Admin'],
                summary: 'Quản trị viên cập nhật trạng thái yêu cầu dịch vụ',
                parameters: [
                    { name: 'id', in: 'path', required: true, schema: { type: 'integer', example: 1 } }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: { type: 'string', enum: ['cho_tiep_nhan', 'da_tiep_nhan', 'dang_thuc_hien', 'hoan_thanh', 'tu_choi'], example: 'hoan_thanh' }
                                }
                            }
                        }
                    }
                },
                responses: {
                    200: { description: 'Cập nhật trạng thái thành công' }
                }
            }
        }
    }
};

const setupSwagger = (app) => {
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'PlotFarm Group 11 API Docs',
        customCss: '.swagger-ui .topbar { display: block; background-color: #1b4332; }'
    }));
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log('📖 Swagger Documentation đang chạy tại http://localhost:5000/api-docs');
};

module.exports = { setupSwagger, swaggerSpec };

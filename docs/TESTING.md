# Kết quả kiểm chứng P1 ngày 31 tháng 10 năm 2026

## Đã chạy tại local

- Lint: qua.
- Unit HTTP/validation: **15/15 qua**; model MongoDB được mock ở nhóm này.
- Integration MongoDB thật: **11/11 qua**, chạy trong Docker test stage, database riêng `product-api-test`.
- Postman collection chạy bằng Newman: **11 request, 13 assertion, 0 lỗi**.
- Script demo: qua health, POST, MongoDB CLI, PUT, GET, DELETE và GET 404 sau xóa.
- Compose build/runtime: product-api và nammongodb healthy, HTTP health UP.
- YAML Compose và 3 workflow: parse hợp lệ; compose-prod config hợp lệ với tên Docker Hub giả chỉ dùng kiểm tra cấu hình.
- `.env` không tracked và được Git ignore. Chưa dùng kết quả Git local thay cho kiểm tra repository GitHub.

Integration bổ sung xác nhận 12 sản phẩm tạo đồng thời có pid khác nhau, pid chỉ định nâng counter, xóa không tái sử dụng id, pid 0/âm/lẻ/chuỗi bị từ chối, body null/field lạ/JSON sai/update rỗng trả 400. Database test có guard tên; afterAll chỉ xóa database test, không xóa database product-api chính.

## Chưa tuyên bố đã chạy từ xa

Workflow đã sửa và chuẩn bị đầy đủ nhưng thay đổi chưa được commit/push trong lượt này. Không có bằng chứng workflow GitHub, push image Docker Hub hoặc job self-hosted local deployment đã chạy. Các bước đó cần secrets và đăng ký runner của chủ tài khoản, được mô tả cụ thể trong DEPLOYMENT_GUIDE.md.

## Chạy lại

```powershell
npm run lint
npm test
docker compose --profile test run --rm --build tests
npm run demo
```

Import collection `postman/P1.postman_collection.json` vào Postman. Muốn chứng minh dữ liệu MongoDB theo phiếu, dừng collection sau Create Product để chạy CLI rồi mới tiếp tục Update/Delete. Logs local ở `artifacts/integration.log`, `artifacts/postman.log`, `artifacts/demo.json`.

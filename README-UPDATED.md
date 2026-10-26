# Business Management Using Chatbot — updated project

## Run locally
1. Start MongoDB service.
2. Terminal 1: `cd backend` then `npm run dev`
3. Terminal 2: `cd frontend` then `npm run dev`
4. Terminal 3: `cd backend` then `npm run bot`

## Added in this update
- Branch model and basic branch API (`/api/branches`).
- Batch-level inventory model and API (`/api/batches`).
- Stock statement preview endpoint (`/api/stock-statements/preview`).
- Stock Statement page with preview table and CSV export.
- Sales now have optional `batchNumber`, `vendorName`, and `branchName` fields.
- Purchase records now have optional `batchNumber`, `branchName`, and `purchaseOrderNumber` fields.

## Important
This is an incremental first pass, not the final production-ready implementation. Existing product-level `stock` remains for compatibility with the current dashboard and bot. Batch-level inventory is a separate source and needs to be adopted by sale and purchase workflows before the two stock representations can be considered fully synchronized. Do not use the new batch API on live records until the batch migration and batch-aware sales/purchase flows are completed and tested.

The stock statement preview currently uses the batch collection. If no batches exist, it will show no rows even if legacy Product records have stock. The CSV is intended as an interim Excel-readable export; exact formatted `.xlsx` matching the provided company template is still pending. The Send button currently displays a notice rather than sending a file. Configure recipient/delivery requirements before enabling real sending.

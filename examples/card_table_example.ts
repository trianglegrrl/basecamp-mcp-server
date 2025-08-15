#!/usr/bin/env node

import { spawn } from 'child_process';
import { CardTable, Column, Card, APIResponse } from '../src/types/basecamp';

interface MCPRequest {
    jsonrpc: string;
    id: number; 
    method: string;
    params?: Record<string, any>;
}

interface MCPResponse {
    result?: {
        content: Array<{text: string}>;
    };
}

function sendMcpRequest(method: string, params?: Record<string, any>): Promise<MCPResponse | null> {
    const request: MCPRequest = {
        jsonrpc: "2.0",
        id: 1,
        method,
        params: params || {}
    };
    
    return new Promise((resolve) => {
        const process = spawn('node', ['mcp_server_cli.js'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        process.stderr.on('data', (data) => {
            stderr += data.toString(); 
        });
        
        process.on('close', (code) => {
            if (code !== 0) {
                console.error(`Error: ${stderr}`);
                resolve(null);
                return;
            }
            
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                console.error('Failed to parse response:', e);
                console.error('Response:', stdout);
                resolve(null);
            }
        });
        
        process.stdin.write(JSON.stringify(request));
        process.stdin.end();
    });
}

async function main() {
    // Example project ID - replace with your actual project ID 
    const projectId = "123456";
    
    console.log("Basecamp Card Table Example");
    console.log("=".repeat(50));
    
    // 1. Get the card table for a project
    console.log("\n1. Getting card table for project...");
    const response = await sendMcpRequest("tools/call", {
        name: "get_card_table",
        arguments: {project_id: projectId}
    });
    
    if (!response?.result) return;
    
    const result = JSON.parse(response.result.content[0].text) as APIResponse<{card_table: CardTable}>;
    
    if (result.status !== "success") {
        console.log("No card table found. Make sure the Card Table tool is enabled in your project.");
        return;
    }
    
    const cardTable = result.data?.card_table;
    const cardTableId = cardTable?.id;
    
    console.log(`Card table found: ${cardTable?.title} (ID: ${cardTableId})`);
    
    // 2. List existing columns
    console.log("\n2. Listing columns...");
    const columnsResponse = await sendMcpRequest("tools/call", {
        name: "get_columns",
        arguments: {
            project_id: projectId,
            card_table_id: cardTableId
        }
    });
    
    if (!columnsResponse?.result) return;
    
    const columnsResult = JSON.parse(columnsResponse.result.content[0].text) as APIResponse<{columns: Column[]}>;
    const columns = columnsResult.data?.columns || [];
    
    console.log(`Found ${columns.length} columns:`);
    for (const col of columns) {
        console.log(`  - ${col.title} (ID: ${col.id})`);
    }
    
    // 3. Create a new column
    console.log("\n3. Creating a new column..."); 
    const newColumnResponse = await sendMcpRequest("tools/call", {
        name: "create_column",
        arguments: {
            project_id: projectId,
            card_table_id: cardTableId,
            title: "Testing"
        }
    });
    
    if (!newColumnResponse?.result) return;
    
    const newColumnResult = JSON.parse(newColumnResponse.result.content[0].text) as APIResponse<{column: Column}>;
    if (newColumnResult.status === "success") {
        const newColumn = newColumnResult.data?.column;
        console.log(`Created column: ${newColumn?.title} (ID: ${newColumn?.id})`);
    }
    
    // 4. Create a card in the first column
    if (columns.length > 0) {
        const firstColumnId = columns[0].id;
        console.log(`\n4. Creating a card in column '${columns[0].title}'...`);
        
        const cardResponse = await sendMcpRequest("tools/call", {
            name: "create_card",
            arguments: {
                project_id: projectId,
                column_id: firstColumnId,
                title: "Test Card",
                content: "This is a test card created via the MCP API"
            }
        });
        
        if (!cardResponse?.result) return;
        
        const cardResult = JSON.parse(cardResponse.result.content[0].text) as APIResponse<{card: Card}>;
        if (cardResult.status === "success") {
            const newCard = cardResult.data?.card;
            console.log(`Created card: ${newCard?.title} (ID: ${newCard?.id})`);
        }
    }
    
    // 5. Update column color
    if (columns.length > 0) {
        console.log(`\n5. Updating color of column '${columns[0].title}'...`);
        
        const colorResponse = await sendMcpRequest("tools/call", {
            name: "update_column_color", 
            arguments: {
                project_id: projectId,
                column_id: columns[0].id,
                color: "#FF0000" // Red
            }
        });
        
        if (!colorResponse?.result) return;
        
        const colorResult = JSON.parse(colorResponse.result.content[0].text) as APIResponse;
        if (colorResult.status === "success") {
            console.log("Updated column color to red");
        }
    }
    
    console.log("\n" + "=".repeat(50));
    console.log("Example completed!");
    console.log("\nNote: Replace the project_id with your actual Basecamp project ID to run this example.");
}

if (require.main === module) {
    main();
}
import 'package:flutter/material.dart';

class MessageInput extends StatelessWidget {
  final TextEditingController controller;
  final bool isSending;
  final Function(String) onSendPressed;
  final VoidCallback onAttachmentPressed;
  
  const MessageInput({
    Key? key,
    required this.controller,
    required this.isSending,
    required this.onSendPressed,
    required this.onAttachmentPressed,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        boxShadow: [
          BoxShadow(
            offset: const Offset(0, -1),
            blurRadius: 5,
            color: Colors.black.withOpacity(0.1),
          ),
        ],
      ),
      child: SafeArea(
        child: Row(
          children: [
            // Attachment button
            IconButton(
              icon: const Icon(Icons.attach_file),
              onPressed: onAttachmentPressed,
              color: Theme.of(context).primaryColor,
            ),
            
            // Message input field
            Expanded(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(24),
                ),
                child: TextField(
                  controller: controller,
                  minLines: 1,
                  maxLines: 5,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: const InputDecoration(
                    hintText: 'Type a message',
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 12),
                  ),
                  textInputAction: TextInputAction.newline,
                ),
              ),
            ),
            
            // Send button
            IconButton(
              icon: isSending
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation<Color>(Colors.teal),
                      ),
                    )
                  : const Icon(Icons.send),
              onPressed: isSending
                  ? null
                  : () {
                      final text = controller.text.trim();
                      if (text.isNotEmpty) {
                        onSendPressed(text);
                      }
                    },
              color: Theme.of(context).primaryColor,
            ),
          ],
        ),
      ),
    );
  }
}
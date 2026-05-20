package com.gwhaitech.accountingfirm.messaging.event;

import com.gwhaitech.accountingfirm.messaging.domain.Message;
import com.gwhaitech.accountingfirm.messaging.domain.MessageThread;

public record MessagePostedEvent(
    MessageThread thread,
    Message message
) {}

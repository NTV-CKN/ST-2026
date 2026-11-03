import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import static com.kms.katalon.core.testobject.ObjectRepository.findWindowsObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.llm.keyword.LlmKeywords as LLM
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testng.keyword.TestNGBuiltinKeywords as TestNGKW
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import com.kms.katalon.core.windows.keyword.WindowsBuiltinKeywords as Windows
import internal.GlobalVariable as GlobalVariable
import org.openqa.selenium.Keys as Keys

String LOGIN = 'Page_PhuKienCongNghe/Page_ng Nhp/'

WebUI.openBrowser(null)
WebUI.maximizeWindow()
WebUI.navigateToUrl(GlobalVariable.BASE_URL + '/login')
WebUI.setText(findTestObject(LOGIN + 'input_Tn ng nhp hoc email'), GlobalVariable.USER_EMAIL)
WebUI.setEncryptedText(findTestObject(LOGIN + 'input_Mt khu'), GlobalVariable.USER_PASSWORD)
WebUI.click(findTestObject(LOGIN + 'input_submit'))
WebUI.waitForPageLoad(5)

WebUI.navigateToUrl(GlobalVariable.BASE_URL + '/user-key?userId=999999')
WebUI.waitForPageLoad(5)

WebUI.verifyTextPresent('Khóa số cá nhân', false)
WebUI.verifyTextNotPresent('Bạn không có quyền', false)
WebUI.verifyTextNotPresent('Không tìm thấy người dùng', false)